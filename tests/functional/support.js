import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { expect } from 'chai';

let app;

export const setApp = (application) => { app = application; };

export const api = () => {
  if (!app) throw new Error('Express no está inicializado para testing');
  return request(app);
};

export const assertSuccess = (response, status = 200) => {
  expect(response.status).to.equal(status);
  expect(response.body).to.have.property('status', 'success');
  expect(response.body).to.have.property('payload');
};

export const assertApiError = (response, status, code) => {
  expect(response.status).to.equal(status);
  expect(response.body).to.have.all.keys('status', 'error');
  expect(response.body.status).to.equal('error');
  expect(response.body.error).to.have.all.keys('code', 'message');
  expect(response.body.error.code).to.equal(code);
  expect(response.body.error.message).to.be.a('string').and.not.empty;
};

export const createTestUser = async () => {
  const data = {
    firstName: 'Clara',
    lastName: 'Soto',
    email: `test-${randomUUID()}@example.test`
  };
  const response = await api().post('/api/users').send(data);
  assertSuccess(response, 201);
  expect(response.body.payload).to.include({ ...data, role: 'user' });
  return response.body.payload;
};

export const createTestOrder = async () => {
  const user = await createTestUser();
  const data = {
    user: user._id,
    description: 'Envío de documentación',
    deliveryAddress: 'Calle Falsa 123',
    totalAmount: 3200,
    priority: 'normal'
  };
  const response = await api().post('/api/orders').send(data);
  assertSuccess(response, 201);
  expect(response.body.payload).to.include({ ...data, status: 'pending' });
  return response.body.payload;
};
