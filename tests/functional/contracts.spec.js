import { describe, it } from 'mocha';
import { expect } from 'chai';
import { api, assertApiError, createTestOrder } from './support.js';

describe('Coherencia con OpenAPI', () => {
  it('Swagger documenta los nuevos métodos de pedidos y sus respuestas HTTP', async () => {
    const response = await api().get('/api/docs/openapi.json');
    expect(response.status).to.equal(200);
    const paths = response.body.paths;
    expect(paths['/api/orders']).to.have.keys('get', 'post');
    expect(paths['/api/orders/{id}/status']).to.have.keys('patch');
    expect(paths['/api/orders'].post.responses).to.have.all.keys('201', '400', '404', '500', '503');
    expect(paths['/api/orders/{id}/status'].patch.responses).to.have.property('404');
    expect(response.body.components.schemas).to.have.property('PedidoCrear');
    expect(response.body.components.schemas).to.have.property('PedidoActualizarEstado');
  });

  it('el código de error de 404 coincide con el de la API real', async () => {
    const response = await api().get('/api/orders/507f1f77bcf86cd799439011');
    assertApiError(response, 404, 'ORDER_NOT_FOUND');
  });

  it('los errores de transición coinciden con el contrato', async () => {
    const order = await createTestOrder();
    const response = await api().patch(`/api/orders/${order._id}/status`).send({ status: 'delivered' });
    assertApiError(response, 400, 'INVALID_ORDER_STATUS');
  });
});
