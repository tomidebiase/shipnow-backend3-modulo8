import test from 'node:test';
import assert from 'node:assert/strict';
import { describeError } from '../src/utils/describe-error.js';
import { errorHandler } from '../src/middlewares/error-handler.js';
import { logger } from '../src/config/logger.js';

test('una variable ausente conserva su nombre en el mensaje del error fatal', () => {
  const error = new Error('Falta configurar la variable de entorno obligatoria: MONGODB_URI');
  const details = describeError(error, { includeStack: true });
  assert.equal(details.errorName, 'Error');
  assert.match(details.errorMessage, /MONGODB_URI/);
  assert.match(details.stack, /MONGODB_URI/);
});

test('los errores 5xx conservan mensaje, stack y detalles de la causa', () => {
  const cause = new Error('MongoDB no está disponible');
  const error = new Error('No se pudo completar la carga de datos', { cause });
  const details = describeError(error, { includeStack: true });
  assert.match(details.errorMessage, /No se pudo completar/);
  assert.match(details.stack, /No se pudo completar/);
  assert.equal(details.causeName, 'Error');
  assert.match(details.causeMessage, /MongoDB no está disponible/);
  assert.match(details.causeStack, /MongoDB no está disponible/);
});

test('se ocultan credenciales de conexión en mensajes y stacks', () => {
  const uri = `mongodb+srv://${['operador', 'clave-supersecreta'].join(':')}@cluster.example/test?token=abc123`;
  const error = new Error(`Error en ${uri}`);
  const details = describeError(error, { includeStack: true });
  const logged = JSON.stringify(details);
  assert.ok(!logged.includes('clave-supersecreta'));
  assert.ok(!logged.includes('abc123'));
  assert.match(logged, /REDACTED/);
  assert.match(logged, /cluster\.example/);
});

test('el middleware registra mensaje y stack del error pero no los expone al cliente', () => {
  const original = logger.error;
  let event;
  logger.error = (message, details) => { event = { message, details }; };
  let code;
  let response;

  try {
    const res = {
      headersSent: false,
      status(value) { code = value; return this; },
      json(value) { response = value; return this; }
    };
    errorHandler(new Error('Detalle de fallo interno'), { method: 'GET', path: '/api/test' }, res, () => {});
  } finally {
    logger.error = original;
  }

  assert.equal(code, 500);
  assert.equal(event.details.statusCode, 500);
  assert.match(event.details.errorMessage, /Detalle de fallo interno/);
  assert.match(event.details.stack, /Detalle de fallo interno/);
  assert.equal(response.error.code, 'INTERNAL_ERROR');
  assert.ok(!JSON.stringify(response).includes('Detalle de fallo interno'));
  assert.ok(!('stack' in response.error));
});

test('los errores esperados continúan siendo advertencias sin stack', () => {
  const original = logger.warning;
  let event;
  logger.warning = (message, details) => { event = { message, details }; };

  try {
    const res = {
      headersSent: false,
      status() { return this; },
      json() { return this; }
    };
    errorHandler({ name: 'ValidationError', message: 'Campo inválido' }, { method: 'POST', path: '/api/users' }, res, () => {});
  } finally {
    logger.warning = original;
  }

  assert.equal(event.details.code, 'INVALID_INPUT');
  assert.ok(!('stack' in event.details));
});
