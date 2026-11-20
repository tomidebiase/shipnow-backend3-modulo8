import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrdersService } from '../src/services/orders.service.js';
import { ORDER_STATUS } from '../src/constants/index.js';

const orderId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439012';

const fixture = () => {
  const stored = { _id: orderId, user: userId, description: 'Paquete', deliveryAddress: 'Calle 3', totalAmount: 100, status: ORDER_STATUS.PENDING, priority: 'normal' };
  const repository = {
    findAll: async () => [stored],
    findById: async id => id === orderId ? stored : null,
    create: async data => ({ _id: orderId, ...data }),
    updateStatus: async (id, status) => ({ ...stored, status }),
    hasDelivery: async () => false
  };
  const userRepository = { findById: async id => id === userId ? { _id: userId, role: 'user' } : null };
  return { service: createOrdersService(repository, { userRepository }), repository, userRepository };
};

const payload = { user: userId, description: 'Paquete', deliveryAddress: 'Calle 3', totalAmount: 100 };

test('lista pedidos mediante el repository', async () => {
  const { service } = fixture();
  const { items, pagination } = await service.getAll();
  assert.equal(items.length, 1);
  assert.equal(items[0]._id, orderId);
  assert.deepEqual(pagination, { page: 1, limit: 20, hasNext: false });
});

test('rechaza filtros de estado inválidos', async () => {
  const { service } = fixture();
  await assert.rejects(service.getAll({ status: 'otro' }), error => error.code === 'INVALID_ORDER_STATUS');
});

test('crea un pedido pendiente con prioridad normal por defecto', async () => {
  const { service } = fixture();
  const order = await service.create(payload);
  assert.equal(order.status, 'pending');
  assert.equal(order.priority, 'normal');
  assert.equal(order.user, userId);
});

test('rechaza pedidos incompletos sin guardar', async () => {
  const { service } = fixture();
  await assert.rejects(service.create({ user: userId }), error => error.code === 'INVALID_INPUT');
});

test('rechaza usuarios inexistentes', async () => {
  const { service } = fixture();
  await assert.rejects(service.create({ ...payload, user: orderId }), error => error.code === 'USER_NOT_FOUND');
});

test('actualiza un estado con una transición permitida', async () => {
  const { service } = fixture();
  const order = await service.updateStatus(orderId, { status: 'confirmed' });
  assert.equal(order.status, 'confirmed');
});

test('rechaza transiciones sin saltos permitidos', async () => {
  const { service } = fixture();
  await assert.rejects(service.updateStatus(orderId, { status: 'delivered' }), error => error.code === 'INVALID_ORDER_STATUS');
});

test('impide desincronizar un pedido asociado a una entrega', async () => {
  const { service, repository } = fixture();
  repository.hasDelivery = async () => true;
  await assert.rejects(service.updateStatus(orderId, { status: 'confirmed' }), error => error.code === 'INVALID_ORDER_STATUS');
});
