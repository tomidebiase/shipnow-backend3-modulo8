import { describe, it } from 'mocha';
import { expect } from 'chai';
import { api, assertApiError, assertSuccess, createTestUser } from './support.js';
import UserModel from '../../src/models/user.model.js';
import OrderModel from '../../src/models/order.model.js';
import DeliveryModel from '../../src/models/delivery.model.js';

const createDelivery = async (status, index) => {
  const user = await createTestUser();
  const order = await OrderModel.create({
    user: user._id, description: `Pedido ${index}`, deliveryAddress: 'Calle 2', totalAmount: 15,
    status: 'pending', priority: 'normal'
  });
  return DeliveryModel.create({ order: order._id, status, trackingCode: `PERF-${index}`, courier: status === 'pending' ? null : user._id });
};

describe('Health check y entorno', () => {
  it('GET /api/health devuelve estado, entorno, uptime y timestamp sin secretos', async () => {
    const response = await api().get('/api/health');
    expect(response.status).to.equal(200);
    expect(response.body).to.have.all.keys('status', 'environment', 'uptimeSeconds', 'timestamp');
    expect(response.body).to.include({ status: 'ok', environment: 'test' });
    expect(response.body.uptimeSeconds).to.be.a('number').and.at.least(0);
    expect(new Date(response.body.timestamp).toString()).not.to.equal('Invalid Date');
    expect(response.headers['cache-control']).to.equal('no-store');
    expect(JSON.stringify(response.body)).not.to.include('MONGODB_URI');
  });

  it('rechaza mocks GET en producción con el error centralizado', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try { assertApiError(await api().get('/api/mocks/users?qty=2'), 403, 'MOCKS_DISABLED'); }
    finally { process.env.NODE_ENV = previous; }
  });

  it('puede deshabilitar la UI de Swagger por entorno', async () => {
    const previous = process.env.ENABLE_SWAGGER;
    process.env.ENABLE_SWAGGER = 'false';
    try {
      assertApiError(await api().get('/api/docs/'), 404, 'ROUTE_NOT_FOUND');
      assertApiError(await api().get('/api/docs/openapi.json'), 404, 'ROUTE_NOT_FOUND');
    } finally {
      if (previous === undefined) delete process.env.ENABLE_SWAGGER;
      else process.env.ENABLE_SWAGGER = previous;
    }
  });
});

describe('Paginación y filtros', () => {
  it('users devuelve máximo 20 registros por defecto y omite documents', async () => {
    await UserModel.insertMany(Array.from({ length: 23 }, (_, index) => ({
      firstName: 'Persona', lastName: 'Prueba', email: `perf-${index}@example.test`, role: 'user'
    })));
    const first = await api().get('/api/users');
    assertSuccess(first);
    expect(first.body.payload).to.have.lengthOf(20);
    expect(first.body.pagination).to.deep.equal({ page: 1, limit: 20, hasNext: true });
    expect(first.body.payload.every(user => !Object.hasOwn(user, 'documents'))).to.equal(true);
    const second = await api().get('/api/users?page=2');
    expect(second.body.payload).to.have.lengthOf(3);
    expect(second.body.pagination.hasNext).to.equal(false);
  });

  it('users solo devuelve documents en consulta individual', async () => {
    const user = await createTestUser();
    const byId = await api().get(`/api/users/${user._id}`);
    assertSuccess(byId);
    expect(byId.body.payload).to.have.property('documents').that.is.an('array');
    const all = await api().get('/api/users');
    expect(all.body.payload[0]).not.to.have.property('documents');
  });

  it('users rechaza paginación fuera de rango', async () => {
    assertApiError(await api().get('/api/users?limit=51'), 400, 'INVALID_INPUT');
    assertApiError(await api().get('/api/users?page=0'), 400, 'INVALID_INPUT');
  });

  it('orders pagina, respeta filtros y no devuelve un listado ilimitado', async () => {
    const user = await createTestUser();
    await OrderModel.insertMany(Array.from({ length: 8 }, (_, index) => ({
      user: user._id, description: `Orden ${index}`, deliveryAddress: 'Calle 1', totalAmount: index,
      status: index % 2 === 0 ? 'pending' : 'confirmed', priority: 'normal'
    })));
    const response = await api().get('/api/orders?limit=3&status=pending');
    assertSuccess(response);
    expect(response.body.payload).to.have.lengthOf(3);
    expect(response.body.pagination).to.deep.equal({ page: 1, limit: 3, hasNext: true });
    expect(response.body.payload.every(item => item.status === 'pending')).to.equal(true);
    assertApiError(await api().get('/api/orders?limit=10000'), 400, 'INVALID_INPUT');
  });

  it('deliveries lista con límite y filtra por estado', async () => {
    await createDelivery('pending', 1);
    await createDelivery('pending', 2);
    await createDelivery('assigned', 3);
    const response = await api().get('/api/deliveries?limit=1&status=pending');
    assertSuccess(response);
    expect(response.body.payload).to.have.lengthOf(1);
    expect(response.body.payload[0]).to.have.property('status', 'pending');
    expect(response.body.pagination.hasNext).to.equal(true);
    assertApiError(await api().get('/api/deliveries?status=otro'), 400, 'INVALID_INPUT');
  });
});
