import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePagination, paginateItems } from '../src/utils/pagination.js';

test('paginación por defecto limitada a 20', () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 20 });
});

test('acepta página y límite válidos', () => {
  assert.deepEqual(parsePagination({ page: '3', limit: '50' }), { page: 3, limit: 50 });
});

test('rechaza parámetros inesperados y límites excesivos', () => {
  for (const query of [{ page: '0' }, { page: '1001' }, { limit: '51' }, { limit: '-1' }, { limit: '2.5' }, { foo: 'x' }]) {
    assert.throws(() => parsePagination(query), { code: 'INVALID_INPUT', statusCode: 400 });
  }
});

test('la paginación no devuelve el elemento extra usado para hasNext', () => {
  const value = paginateItems([1, 2, 3], { page: 1, limit: 2 });
  assert.deepEqual(value, { items: [1, 2], pagination: { page: 1, limit: 2, hasNext: true } });
});
