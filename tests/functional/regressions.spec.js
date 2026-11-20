import { describe, it } from 'mocha';
import { expect } from 'chai';
import { api, assertApiError, assertSuccess, createTestUser } from './support.js';

describe('Regresiones de usuarios y mocks', () => {
  it('PATCH /api/users/:id actualiza datos válidos', async () => {
    const created = await createTestUser();
    const response = await api().patch(`/api/users/${created._id}`).send({ firstName: 'Luisa' });
    assertSuccess(response);
    expect(response.body.payload.firstName).to.equal('Luisa');
  });

  it('PATCH /api/users/:id rechaza campos desconocidos', async () => {
    const created = await createTestUser();
    const response = await api().patch(`/api/users/${created._id}`).send({ role: 'admin' });
    assertApiError(response, 400, 'INVALID_INPUT');
  });

  it('PATCH /api/users/:id rechaza usuarios inexistentes', async () => {
    assertApiError(await api().patch('/api/users/507f1f77bcf86cd799439011').send({ firstName: 'Luisa' }), 404, 'USER_NOT_FOUND');
  });

  it('DELETE /api/users/:id elimina un usuario y devuelve 204 sin body', async () => {
    const user = await createTestUser();
    const removed = await api().delete(`/api/users/${user._id}`);
    expect(removed.status).to.equal(204);
    expect(removed.text).to.be.empty;
    assertApiError(await api().get(`/api/users/${user._id}`), 404, 'USER_NOT_FOUND');
  });

  it('DELETE /api/users/:id rechaza usuario inexistente', async () => {
    assertApiError(await api().delete('/api/users/507f1f77bcf86cd799439011'), 404, 'USER_NOT_FOUND');
  });

  it('POST /api/users rechaza emails duplicados', async () => {
    const user = await createTestUser();
    const response = await api().post('/api/users').send({ firstName: 'Ana', lastName: 'García', email: user.email });
    assertApiError(response, 409, 'DUPLICATE_EMAIL');
  });

  it('POST /api/mocks/seed está prohibido en producción', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      assertApiError(await api().post('/api/mocks/seed?qty=1').send({}), 403, 'MOCK_SEED_DISABLED');
      assertApiError(await api().post('/api/mocks/seed/all?qty=1').send({}), 403, 'MOCK_SEED_DISABLED');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
