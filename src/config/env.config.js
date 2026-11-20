import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

for (const name of ['PORT', 'MONGODB_URI', 'NODE_ENV']) {
  if (!process.env[name]?.trim()) {
    throw new Error(`Falta configurar la variable de entorno obligatoria: ${name}`);
  }
}

const nodeEnv = process.env.NODE_ENV.trim();
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV debe ser development, test o production');
}

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un entero entre 1 y 65535');
}

const mongoUri = process.env.MONGODB_URI.trim();
if (!/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) {
  throw new Error('MONGODB_URI debe comenzar con mongodb:// o mongodb+srv://');
}

const logLevel = process.env.LOG_LEVEL?.trim() || (nodeEnv === 'production' ? 'info' : 'debug');
if (!['fatal', 'error', 'warning', 'info', 'http', 'debug'].includes(logLevel)) {
  throw new Error('LOG_LEVEL debe ser fatal, error, warning, info, http o debug');
}

const swaggerValue = process.env.ENABLE_SWAGGER?.trim() || 'true';
if (!['true', 'false'].includes(swaggerValue)) {
  throw new Error('ENABLE_SWAGGER debe ser true o false');
}

const uploadsDir = process.env.UPLOADS_DIR?.trim() || null;
if (uploadsDir && !path.isAbsolute(uploadsDir)) {
  throw new Error('UPLOADS_DIR debe ser una ruta absoluta');
}

const externalServiceUrl = process.env.EXTERNAL_SERVICE_URL?.trim() || null;
if (externalServiceUrl) {
  try {
    const url = new URL(externalServiceUrl);
    if (!['http:', 'https:'].includes(url.protocol) || (nodeEnv === 'production' && url.protocol !== 'https:')) {
      throw new Error('Protocolo de URL inválido');
    }
  } catch {
    throw new Error('EXTERNAL_SERVICE_URL debe ser una URL HTTP(S) válida; HTTPS en producción');
  }
}

export const config = Object.freeze({
  port, mongoUri, nodeEnv, logLevel,
  swaggerEnabled: swaggerValue === 'true',
  uploadsDir, externalServiceUrl
});
