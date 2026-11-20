import test from 'node:test';
import assert from 'node:assert/strict';
import { getHealth } from '../src/controllers/health.controller.js';

test('health check no incluye secretos, rutas de almacenamiento ni URI', () => {
  const headers = {};
  let status, body;
  const res = {
    set(key, value) { headers[key] = value; return this; },
    status(value) { status = value; return this; },
    json(value) { body = value; return this; }
  };
  getHealth({}, res);
  assert.equal(status, 200);
  assert.deepEqual(Object.keys(body), ['status', 'environment', 'uptimeSeconds', 'timestamp']);
  assert.equal(body.status, 'ok');
  assert.equal(headers['Cache-Control'], 'no-store');
  assert.ok(Number.isInteger(body.uptimeSeconds));
  assert.ok(!JSON.stringify(body).includes('mongodb://'));
  assert.ok(!JSON.stringify(body).includes('password'));
});
