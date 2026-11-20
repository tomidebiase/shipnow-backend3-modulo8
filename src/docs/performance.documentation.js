import { MAX_PAGE_LIMIT, MAX_PAGE_NUMBER, DEFAULT_PAGE_LIMIT } from '../utils/pagination.js';
import { DELIVERY_STATUS } from '../constants/index.js';

const ref = name => ({ $ref: `#/components/schemas/${name}` });
const json = schema => ({ 'application/json': { schema } });
const success = payload => ({
  allOf: [ref('RespuestaExitosa'), {
    type: 'object',
    properties: {
      payload,
      pagination: ref('Paginacion')
    }
  }]
});
const error = description => ({ description, content: json(ref('Error')) });
export const paginationParameters = [
  { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: MAX_PAGE_NUMBER, default: 1 } },
  { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: MAX_PAGE_LIMIT, default: DEFAULT_PAGE_LIMIT } }
];
export const listSuccess = schema => success({ type: 'array', items: ref(schema) });

export const performanceSchemas = {
  UsuarioResumen: {
    type: 'object',
    required: ['_id', 'firstName', 'lastName', 'email', 'role'],
    description: 'Datos del listado general: excluye documents y las rutas de archivos privados.',
    properties: {
      _id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['admin', 'user', 'repartidor'] },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },
  Paginacion: {
    type: 'object',
    required: ['page', 'limit', 'hasNext'],
    properties: {
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: MAX_PAGE_LIMIT },
      hasNext: { type: 'boolean' }
    }
  },
  Health: {
    type: 'object',
    required: ['status', 'environment', 'uptimeSeconds', 'timestamp'],
    properties: {
      status: { type: 'string', enum: ['ok'] },
      environment: { type: 'string', enum: ['development', 'test', 'production'] },
      uptimeSeconds: { type: 'integer', minimum: 0 },
      timestamp: { type: 'string', format: 'date-time' }
    }
  }
};

export const performancePaths = {
  '/api/health': {
    get: {
      tags: ['Health'],
      summary: 'Estado básico de la API',
      description: 'No verifica la disponibilidad de MongoDB; permite comprobar que el proceso HTTP responde sin exponer datos sensibles.',
      responses: {
        '200': { description: 'Proceso disponible', content: json(ref('Health')) }
      }
    }
  },
  '/api/deliveries': {
    get: {
      tags: ['Deliveries'],
      summary: 'Listar entregas con paginación',
      description: 'Máximo 50 registros por página; por defecto 20. Puede filtrar por status.',
      parameters: [...paginationParameters, {
        name: 'status', in: 'query', required: false,
        schema: { type: 'string', enum: Object.values(DELIVERY_STATUS) }
      }],
      responses: {
        '200': { description: 'Entregas paginadas', content: json(listSuccess('Entrega')) },
        '400': error('INVALID_INPUT: parámetros de búsqueda o estado inválidos'),
        '500': error('INTERNAL_ERROR'),
        '503': error('DATABASE_UNAVAILABLE')
      }
    }
  }
};
