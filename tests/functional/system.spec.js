import { describe, it } from 'mocha';
import { expect } from 'chai';
import { api, assertApiError, assertSuccess, createTestUser } from './support.js';
import OrderModel from '../../src/models/order.model.js';
import DeliveryModel from '../../src/models/delivery.model.js';

describe('Logger y Swagger', () => {
  it('GET /api/logger/test genera los seis niveles', async () => {
    const response = await api().get('/api/logger/test');
    expect(response.status).to.equal(200);
    expect(response.body.status).to.equal('success');
    expect(response.body.levels).to.deep.equal(['debug', 'http', 'info', 'warning', 'error', 'fatal']);
    expect(response.body.message).to.be.a('string').and.not.empty;
  });

  it('GET /api/logger/test rechaza su uso en producción', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      assertApiError(await api().get('/api/logger/test'), 403, 'LOGGER_TEST_DISABLED');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('GET /api/docs/ abre Swagger UI', async () => {
    const response = await api().get('/api/docs/');
    expect(response.status).to.equal(200);
    expect(response.headers['content-type']).to.include('text/html');
    expect(response.text).to.include('Swagger UI');
  });

  it('GET /api/docs/openapi.json expone las rutas reales', async () => {
    const response = await api().get('/api/docs/openapi.json');
    expect(response.status).to.equal(200);
    expect(response.body.openapi).to.equal('3.0.3');
    expect(response.body.paths).to.have.property('/api/orders');
    expect(response.body.paths).to.have.property('/api/orders/{id}/status');
  });

  it('GET /api/ruta-inexistente responde 404 uniforme', async () => {
    assertApiError(await api().get('/api/ruta-inexistente'), 404, 'ROUTE_NOT_FOUND');
  });
});

describe('Entregas y productos', () => {
  it('GET /api/deliveries/:id devuelve una entrega guardada de prueba', async () => {
    const user = await createTestUser();
    const order = await OrderModel.create({
      user: user._id,
      description: 'Entrega funcional',
      deliveryAddress: 'Calle 9 123',
      totalAmount: 500,
      status: 'pending',
      priority: 'normal'
    });
    const delivery = await DeliveryModel.create({ order: order._id, courier: null, status: 'pending', trackingCode: 'TEST-1' });
    const response = await api().get(`/api/deliveries/${delivery._id}`);
    assertSuccess(response);
    expect(response.body.payload).to.include({ _id: String(delivery._id), trackingCode: 'TEST-1', status: 'pending' });
  });

  it('GET /api/deliveries/:id devuelve 404 cuando no existe', async () => {
    assertApiError(await api().get('/api/deliveries/507f1f77bcf86cd799439011'), 404, 'DELIVERY_NOT_FOUND');
  });

  it('GET /api/products devuelve una lista incluso sin productos', async () => {
    const response = await api().get('/api/products');
    assertSuccess(response);
    expect(response.body.payload).to.be.an('array').with.lengthOf(0);
  });

  it('POST /api/products rechaza un precio negativo', async () => {
    assertApiError(await api().post('/api/products').send({ name: 'Caja', price: -100, stock: 1 }), 400, 'INVALID_INPUT');
  });
});
