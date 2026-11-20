import multer from 'multer';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';
import { DomainError } from '../errors/domain-errors.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const UPLOADS_ROOT = path.resolve(process.env.UPLOADS_DIR ?? path.join(root, 'uploads'));
export const FILE_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_TYPES = Object.freeze(['identity', 'license', 'other']);
export const ALLOWED_MIME_TYPES = Object.freeze({
  'application/pdf': Object.freeze({ extensions: ['.pdf'], savedExtension: '.pdf' }),
  'image/png': Object.freeze({ extensions: ['.png'], savedExtension: '.png' }),
  'image/jpeg': Object.freeze({ extensions: ['.jpg', '.jpeg'], savedExtension: '.jpg' })
});

const relativeDirectories = Object.freeze({
  user: path.join('users', 'documents'),
  delivery: path.join('deliveries', 'proofs')
});

export const getRelativeUploadPath = (category, filename) => path.posix.join(
  ...relativeDirectories[category].split(path.sep),
  filename
);

const createUpload = (category, maxFields) => {
  const directory = path.join(UPLOADS_ROOT, relativeDirectories[category]);
  const handler = multer({
    storage: multer.diskStorage({
      destination(_req, _file, done) {
        mkdir(directory, { recursive: true }).then(() => done(null, directory), error => {
          done(new DomainError('FILE_SAVE_FAILED', undefined, { cause: error }));
        });
      },
      filename(_req, file, done) {
        done(null, `${randomUUID()}${ALLOWED_MIME_TYPES[file.mimetype].savedExtension}`);
      }
    }),
    fileFilter(_req, file, done) {
      const policy = ALLOWED_MIME_TYPES[file.mimetype];
      const extension = path.extname(file.originalname).toLowerCase();
      if (!policy || !policy.extensions.includes(extension)) {
        logger.warning('Carga de archivo rechazada por formato', { mimeType: file.mimetype });
        return done(new DomainError('FILE_TYPE_INVALID'));
      }
      done(null, true);
    },
    limits: {
      fileSize: FILE_MAX_BYTES,
      files: 1,
      fields: maxFields,
      parts: maxFields + 1,
      fieldNameSize: 80,
      fieldSize: 256
    }
  }).single('file');

  return (req, res, next) => handler(req, res, error => {
    if (error) {
      logger.warning('Falló la recepción de un archivo', { code: error.code ?? 'FILE_SAVE_FAILED' });
    }
    next(error);
  });
};

export const uploadUserDocument = createUpload('user', 1);
export const uploadDeliveryProof = createUpload('delivery', 0);
