import { describe, it } from 'mocha';
import { expect } from 'chai';
import { api, assertApiError } from './support.js';
import UserModel from '../../src/models/user.model.js';
import OrderModel from '../../src/models/order.model.js';
import DeliveryModel from '../../src/models/delivery.model.js';

describe('Mocks', () => {
  for (const [route, field] of [
    ['/api/mocks/users', 'role'],
    ['/api/mocks/couriers', 'role'],
    ['/api/mocks/orders', 'status'],
    ['/api/mocks/deliveries', 'trackingCode']
  ]) {
    it(`GET ${route} genera datos válidos sin persistir`, async () => {
      const response = await api().get(`${route}?qty=2`);
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array').with.lengthOf(2);
      expect(response.body[0]).to.have.property(field);
      expect(await UserModel.countDocuments()).to.equal(0);
      expect(await OrderModel.countDocuments()).to.equal(0);
      expect(await DeliveryModel.countDocuments()).to.equal(0);
    });
    it(`GET ${route} rechaza qty negativo`, async () => {
      assertApiError(await api().get(`${route}?qty=-2`), 400, 'INVALID_MOCK_QUANTITY');
    });
  }

  it('GET /api/mocks/bundle conserva relaciones sin insertar', async () => {
    const response = await api().get('/api/mocks/bundle?qty=3');
    expect(response.status).to.equal(200);
    expect(response.body).to.have.all.keys('users', 'couriers', 'orders', 'deliveries');
    expect(response.body.orders).to.have.lengthOf(3);
    expect(response.body.deliveries).to.have.lengthOf(3);
    const ids = new Set(response.body.users.map(x => x._id));
    expect(response.body.orders.every(order => ids.has(order.user))).to.equal(true);
    expect(await OrderModel.countDocuments()).to.equal(0);
  });

  it('GET /api/mocks/bundle rechaza qty fuera del rango', async () => {
    assertApiError(await api().get('/api/mocks/bundle?qty=101'), 400, 'INVALID_MOCK_QUANTITY');
  });

  it('GET /api/mocks/orders valida estado y prioridad', async () => {
    assertApiError(await api().get('/api/mocks/orders?status=desconocido'), 400, 'INVALID_ORDER_STATUS');
    assertApiError(await api().get('/api/mocks/orders?priority=urgente'), 400, 'INVALID_ORDER_PRIORITY');
  });

  it('POST /api/mocks/seed inserta usuarios de prueba', async () => {
    const response = await api().post('/api/mocks/seed?qty=2').send({});
    expect(response.status).to.equal(201);
    expect(response.body).to.deep.equal({ insertados: 2, coleccion: 'usuarios' });
    expect(await UserModel.countDocuments()).to.equal(2);
  });

  it('POST /api/mocks/seed rechaza datos incorrectos', async () => {
    assertApiError(await api().post('/api/mocks/seed?qty=0').send({}), 400, 'INVALID_MOCK_QUANTITY');
    expect(await UserModel.countDocuments()).to.equal(0);
  });

  it('POST /api/mocks/seed/all inserta registros relacionados', async () => {
    const response = await api().post('/api/mocks/seed/all?qty=2').send({});
    expect(response.status).to.equal(201);
    expect(response.body).to.have.all.keys('insertados', 'colecciones');
    expect(response.body.insertados).to.include({ pedidos: 2, entregas: 2 });
    expect(await OrderModel.countDocuments()).to.equal(2);
    expect(await DeliveryModel.countDocuments()).to.equal(2);
    const delivery = await DeliveryModel.findOne();
    expect(delivery.order).to.exist;
  });

  it('POST /api/mocks/seed/all rechaza qty negativo sin escribir', async () => {
    assertApiError(await api().post('/api/mocks/seed/all?qty=-1').send({}), 400, 'INVALID_MOCK_QUANTITY');
    expect(await UserModel.countDocuments()).to.equal(0);
    expect(await DeliveryModel.countDocuments()).to.equal(0);
  });
});
