import { describe, it } from 'mocha';
import { expect } from 'chai';
import { api, assertApiError, assertSuccess, createTestUser } from './support.js';

describe('Usuarios', () => {
  it('GET /api/users devuelve una lista controlada', async () => {
    const created = await createTestUser();
    const response = await api().get('/api/users');
    assertSuccess(response);
    expect(response.body.payload).to.be.an('array').with.lengthOf(1);
    expect(response.body.payload[0]).to.include({ _id: created._id, email: created.email, role: 'user' });
  });

  it('POST /api/users rechaza datos incompletos', async () => {
    const response = await api().post('/api/users').send({ firstName: 'Clara' });
    assertApiError(response, 400, 'INVALID_INPUT');
  });

  it('GET /api/users/:id devuelve 404 si no existe', async () => {
    const response = await api().get('/api/users/507f1f77bcf86cd799439011');
    assertApiError(response, 404, 'USER_NOT_FOUND');
  });

  it('GET /api/users/:id devuelve el usuario existente', async () => {
    const user = await createTestUser();
    const response = await api().get(`/api/users/${user._id}`);
    assertSuccess(response);
    expect(response.body.payload).to.include({ _id: user._id, email: user.email });
  });
});
