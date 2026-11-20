import { open, unlink, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { uploadsRepository } from '../repositories/uploads.repository.js';
import { assertValidObjectId } from '../utils/object-id.js';
import { DomainError, UserNotFoundError, DeliveryNotFoundError } from '../errors/domain-errors.js';
import { logger } from '../config/logger.js';
import { DOCUMENT_TYPES, UPLOADS_ROOT, getRelativeUploadPath } from '../config/uploads.config.js';

const exists = (repository, kind) => kind === 'user' ? repository.getUser : repository.getDelivery;
const notFound = kind => kind === 'user' ? new UserNotFoundError() : new DeliveryNotFoundError();

export const createUploadsService = (repository = uploadsRepository) => ({
  async ensureEntity(kind, id) {
    assertValidObjectId(id);
    if (!await exists(repository, kind)(id)) throw notFound(kind);
  },

  async attach(kind, id, file, fields) {
    if (!file) throw new DomainError('FILE_REQUIRED');
    let saved = false;
    let storedPath = file.path;
    try {
      const fieldNames = Object.keys(fields ?? {});
      let documentType;
      if (kind === 'user') {
        if (fieldNames.length !== 1 || fieldNames[0] !== 'documentType' ||
            typeof fields.documentType !== 'string' || !DOCUMENT_TYPES.includes(fields.documentType)) {
          throw new DomainError('DOCUMENT_TYPE_INVALID');
        }
        documentType = fields.documentType;
      } else {
        if (fieldNames.length !== 0) throw new DomainError('FILE_FIELD_INVALID');
        documentType = 'delivery_proof';
      }
      const header = Buffer.alloc(8);
      const handle = await open(file.path, 'r');
      let bytes;
      try {
        ({ bytesRead: bytes } = await handle.read(header, 0, header.length, 0));
      } finally {
        await handle.close();
      }
      const valid = file.mimetype === 'application/pdf'
        ? bytes >= 5 && header.subarray(0, 5).toString('ascii') === '%PDF-'
        : file.mimetype === 'image/png'
          ? bytes >= 8 && header.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : bytes >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      if (!valid) {
        logger.warning('Archivo rechazado por contenido no válido', { mimeType: file.mimetype });
        throw new DomainError('FILE_TYPE_INVALID');
      }
      let relativePath = getRelativeUploadPath(kind, file.filename);
      if (kind === 'user' && documentType === 'license') {
        const directory = path.join(UPLOADS_ROOT, 'users', 'licenses');
        await mkdir(directory, { recursive: true });
        const destination = path.join(directory, file.filename);
        await rename(file.path, destination);
        storedPath = destination;
        relativePath = path.posix.join('users', 'licenses', file.filename);
      }
      const metadata = {
        originalName: path.basename(file.originalname.replaceAll('\\', '/')).slice(0, 180),
        storedName: file.filename,
        relativePath,
        mimeType: file.mimetype,
        size: file.size,
        documentType,
        uploadedAt: new Date()
      };
      const entity = kind === 'user'
        ? await repository.appendUserDocument(id, metadata)
        : await repository.appendDeliveryProof(id, metadata);
      if (!entity) throw notFound(kind);
      saved = true;
      logger.info('Archivo asociado a entidad', { entityType: kind, entityId: id, documentType, size: file.size });
      return entity;
    } catch (error) {
      logger[error.statusCode && error.statusCode < 500 ? 'warning' : 'error']('No se pudo completar la carga', {
        entityType: kind,
        entityId: id,
        errorName: error.name,
        code: error.code ?? 'FILE_SAVE_FAILED'
      });
      throw error instanceof DomainError ? error : new DomainError('FILE_SAVE_FAILED', undefined, { cause: error });
    } finally {
      if (!saved) {
        try { await unlink(storedPath); }
        catch (error) { if (error.code !== 'ENOENT') logger.error('No se pudo eliminar archivo de carga fallida', { code: error.code }); }
      }
    }
  }
});

export const uploadsService = createUploadsService();
