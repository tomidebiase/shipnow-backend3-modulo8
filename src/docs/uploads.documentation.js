import { DOCUMENT_TYPES, FILE_MAX_BYTES, ALLOWED_MIME_TYPES } from '../config/uploads.config.js';

const ref = name => ({ $ref: `#/components/schemas/${name}` });
const json = schema => ({ 'application/json': { schema } });
const error = description => ({ description, content: json(ref('Error')) });
const success = schema => ({
  allOf: [ref('RespuestaExitosa'), { type: 'object', properties: { payload: ref(schema) } }]
});
const id = {
  name: 'id', in: 'path', required: true,
  description: 'Identificador ObjectId válido de la entidad',
  schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
};
const file = {
  type: 'string', format: 'binary',
  description: `Archivo PDF, PNG o JPEG; máximo ${FILE_MAX_BYTES} bytes. El campo debe llamarse file.`
};

export const uploadSchemas = {
  ArchivoMetadatos: {
    type: 'object',
    required: ['originalName', 'storedName', 'relativePath', 'mimeType', 'size', 'documentType', 'uploadedAt'],
    properties: {
      originalName: { type: 'string', example: 'dni-frente.pdf' },
      storedName: { type: 'string', example: '32d89cda-f2ae-44ba-aa77-2d304cce9991.pdf' },
      relativePath: { type: 'string', example: 'users/documents/32d89cda-f2ae-44ba-aa77-2d304cce9991.pdf' },
      mimeType: { type: 'string', enum: Object.keys(ALLOWED_MIME_TYPES) },
      size: { type: 'integer', minimum: 1, maximum: FILE_MAX_BYTES },
      documentType: { type: 'string', enum: [...DOCUMENT_TYPES, 'delivery_proof'] },
      uploadedAt: { type: 'string', format: 'date-time' }
    }
  }
};

export const uploadPaths = {
  '/api/users/{id}/documents': {
    post: {
      tags: ['Users'],
      summary: 'Subir documento de usuario',
      description: 'Valida que el usuario exista y que el documento sea PDF, PNG o JPEG. Guarda el archivo en uploads/users/documents y agrega sus metadatos al usuario.',
      parameters: [id],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object', additionalProperties: false,
              required: ['file', 'documentType'],
              properties: { file, documentType: { type: 'string', enum: DOCUMENT_TYPES } }
            }
          }
        }
      },
      responses: {
        '201': { description: 'Usuario actualizado con el documento asociado', content: json(success('Usuario')) },
        '400': error('INVALID_ID, FILE_REQUIRED, FILE_TYPE_INVALID, FILE_FIELD_INVALID o DOCUMENT_TYPE_INVALID'),
        '404': error('USER_NOT_FOUND'),
        '413': error('FILE_TOO_LARGE'),
        '500': error('FILE_SAVE_FAILED o INTERNAL_ERROR'),
        '503': error('DATABASE_UNAVAILABLE')
      }
    }
  },
  '/api/deliveries/{id}/proofs': {
    post: {
      tags: ['Deliveries'],
      summary: 'Subir comprobante de entrega',
      description: 'Requiere una entrega existente. Guarda el comprobante PDF, PNG o JPEG en uploads/deliveries/proofs y agrega sus metadatos a la entrega. No admite campos adicionales.',
      parameters: [id],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object', additionalProperties: false,
              required: ['file'],
              properties: { file }
            }
          }
        }
      },
      responses: {
        '201': { description: 'Entrega actualizada con comprobante asociado', content: json(success('Entrega')) },
        '400': error('INVALID_ID, FILE_REQUIRED, FILE_TYPE_INVALID o FILE_FIELD_INVALID'),
        '404': error('DELIVERY_NOT_FOUND'),
        '413': error('FILE_TOO_LARGE'),
        '500': error('FILE_SAVE_FAILED o INTERNAL_ERROR'),
        '503': error('DATABASE_UNAVAILABLE')
      }
    }
  }
};
