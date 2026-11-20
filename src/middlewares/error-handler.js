import { normalizeError } from '../errors/normalize-error.js';
import { logger } from '../config/logger.js';
import { describeError } from '../utils/describe-error.js';

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const normalized = normalizeError(error);
  const details = {
    code: normalized.code,
    statusCode: normalized.statusCode,
    method: req.method,
    path: req.path
  };

  if (normalized.statusCode >= 500) {
    logger.error('Error durante el procesamiento de la solicitud', {
      ...details,
      ...describeError(error, { includeStack: true })
    });
  } else {
    logger.warning('Solicitud rechazada', details);
  }

  return res.status(normalized.statusCode).json({
    status: 'error',
    error: {
      code: normalized.code,
      message: normalized.message
    }
  });
};
