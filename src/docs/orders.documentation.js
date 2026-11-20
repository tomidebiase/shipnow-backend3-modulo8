import { ORDER_PRIORITY, ORDER_STATUS } from '../constants/index.js';

const objectId = { type: 'string', pattern: '^[a-fA-F0-9]{24}$' };
const schemaRef = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ 'application/json': { schema } });
const error = (description) => ({ description, content: json(schemaRef('Error')) });
const success = (payload) => ({
  allOf: [
    schemaRef('RespuestaExitosa'),
    { type: 'object', properties: { payload } }
  ]
});
const response = (description, schema) => ({ description, content: json(schema) });
const commonErrors = {
  '500': error('INTERNAL_ERROR: error inesperado'),
  '503': error('DATABASE_UNAVAILABLE: base de datos no disponible')
};

export const orderSchemas = {
  PedidoCrear: {
    type: 'object',
    additionalProperties: false,
    required: ['user', 'description', 'deliveryAddress', 'totalAmount'],
    properties: {
      user: { ...objectId, description: 'ID de usuario existente con rol user' },
      description: { type: 'string', minLength: 1 },
      deliveryAddress: { type: 'string', minLength: 1 },
      totalAmount: { type: 'number', minimum: 0 },
      priority: { type: 'string', enum: Object.values(ORDER_PRIORITY), default: ORDER_PRIORITY.NORMAL }
    },
    description: 'El pedido se crea siempre con status pending. No se permite enviar status.'
  },
  PedidoActualizarEstado: {
    type: 'object',
    additionalProperties: false,
    required: ['status'],
    properties: { status: { type: 'string', enum: Object.values(ORDER_STATUS) } },
    description: 'Transiciones: pending a confirmed/cancelled, confirmed a in_transit/cancelled, in_transit a delivered/cancelled. No se pueden modificar pedidos que ya tienen entrega asociada.'
  }
};

export const orderPaths = {
  '/api/orders': {
    get: {
      tags: ['Orders'],
      summary: 'Listar pedidos',
      description: 'Lista los pedidos guardados en MongoDB. Se puede filtrar por status.',
      parameters: [{
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: Object.values(ORDER_STATUS) }
      }],
      responses: {
        '200': response('Listado de pedidos', success({ type: 'array', items: schemaRef('Pedido') })),
        '400': error('INVALID_INPUT o INVALID_ORDER_STATUS: filtro no permitido'),
        ...commonErrors
      }
    },
    post: {
      tags: ['Orders'],
      summary: 'Crear pedido',
      description: 'Crea un pedido pendiente para un usuario existente con rol user.',
      requestBody: { required: true, content: json(schemaRef('PedidoCrear')) },
      responses: {
        '201': response('Pedido creado', success(schemaRef('Pedido'))),
        '400': error('INVALID_INPUT, INVALID_ID, INVALID_ORDER_PRIORITY o INVALID_JSON'),
        '404': error('USER_NOT_FOUND: usuario no existente'),
        ...commonErrors
      }
    }
  },
  '/api/orders/{id}/status': {
    patch: {
      tags: ['Orders'],
      summary: 'Actualizar estado de un pedido',
      description: 'Actualiza un pedido sin entrega asociada, respetando las transiciones válidas. No permite alterar entregas generadas por mocks.',
      parameters: [{ name: 'id', in: 'path', required: true, schema: objectId }],
      requestBody: { required: true, content: json(schemaRef('PedidoActualizarEstado')) },
      responses: {
        '200': response('Pedido actualizado', success(schemaRef('Pedido'))),
        '400': error('INVALID_ID, INVALID_INPUT, INVALID_ORDER_STATUS o INVALID_JSON'),
        '404': error('ORDER_NOT_FOUND: pedido inexistente'),
        ...commonErrors
      }
    }
  }
};
