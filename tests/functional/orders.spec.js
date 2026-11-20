import { describe, it } from 'mocha';
import { expect } from 'chai';
import { api, assertApiError, assertSuccess, createTestOrder, createTestUser } from './support.js';

describe('Pedidos', () => {
  it('GET /api/orders devuelve una lista con estructura estable', async () => {
    const order = await createTestOrder();
    const response = await api().get('/api/orders');
    assertSuccess(response);
    expect(response.body.payload).to.be.an('array').with.lengthOf(1);
    expect(response.body.payload[0]).to.include({ _id: order._id, status: 'pending' });
  });

  it('GET /api/orders valida filtros de estado', async () => {
    const response = await api().get('/api/orders?status=ilegal');
    assertApiError(response, 400, 'INVALID_ORDER_STATUS');
  });

  it('POST /api/orders crea un pedido pendiente con usuario válido', async () => {
    const order = await createTestOrder();
    expect(order._id).to.match(/^[0-9a-f]{24}$/);
    expect(order).to.include({ status: 'pending', priority: 'normal', totalAmount: 3200 });
    expect(order).to.have.property('deliveryAddress', 'Calle Falsa 123');
  });

  it('POST /api/orders rechaza cuerpos incompletos', async () => {
    const user = await createTestUser();
    const response = await api().post('/api/orders').send({ user: user._id, description: 'Falta importe' });
    assertApiError(response, 400, 'INVALID_INPUT');
  });

  it('POST /api/orders rechaza un usuario inexistente', async () => {
    const response = await api().post('/api/orders').send({
      user: '507f1f77bcf86cd799439011',
      description: 'Pedido sin usuario',
      deliveryAddress: 'Av. Siempre Viva 742',
      totalAmount: 120
    });
    assertApiError(response, 404, 'USER_NOT_FOUND');
  });

  it('GET /api/orders/:id consulta el pedido recién creado', async () => {
    const order = await createTestOrder();
    const response = await api().get(`/api/orders/${order._id}`);
    assertSuccess(response);
    expect(response.body.payload).to.include({ _id: order._id, user: order.user, status: 'pending' });
  });

  it('GET /api/orders/:id responde 404 si no existe', async () => {
    const response = await api().get('/api/orders/507f1f77bcf86cd799439011');
    assertApiError(response, 404, 'ORDER_NOT_FOUND');
  });

  it('PATCH /api/orders/:id/status permite una transición válida', async () => {
    const order = await createTestOrder();
    const response = await api().patch(`/api/orders/${order._id}/status`).send({ status: 'confirmed' });
    assertSuccess(response);
    expect(response.body.payload).to.include({ _id: order._id, status: 'confirmed' });
    const reloaded = await api().get(`/api/orders/${order._id}`);
    expect(reloaded.body.payload.status).to.equal('confirmed');
  });

  it('PATCH /api/orders/:id/status rechaza estados inválidos', async () => {
    const order = await createTestOrder();
    const response = await api().patch(`/api/orders/${order._id}/status`).send({ status: 'entregado-inventado' });
    assertApiError(response, 400, 'INVALID_ORDER_STATUS');
  });

  it('PATCH /api/orders/:id/status rechaza transiciones indebidas', async () => {
    const order = await createTestOrder();
    const response = await api().patch(`/api/orders/${order._id}/status`).send({ status: 'delivered' });
    assertApiError(response, 400, 'INVALID_ORDER_STATUS');
  });

  it('PATCH /api/orders/:id/status responde 404 ante un pedido inexistente', async () => {
    const response = await api().patch('/api/orders/507f1f77bcf86cd799439011/status').send({ status: 'confirmed' });
    assertApiError(response, 404, 'ORDER_NOT_FOUND');
  });
});
