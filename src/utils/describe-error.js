const sanitize = (value) => String(value)
  .replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, '$1[REDACTED]@')
  .replace(/((?:password|passwd|token|secret|api[_-]?key)\s*[:=]\s*)[^\s;,]+/gi, '$1[REDACTED]')
  .replace(/([?&](?:password|token|api[_-]?key)=)[^&\s]+/gi, '$1[REDACTED]');

export const describeError = (error, { includeStack = false } = {}) => {
  const details = {
    errorName: sanitize(error?.name ?? 'Error'),
    errorMessage: sanitize(error?.message ?? 'Error no especificado')
  };

  if (includeStack && typeof error?.stack === 'string') {
    details.stack = sanitize(error.stack);
  }

  if (error?.cause && error.cause !== error) {
    details.causeName = sanitize(error.cause.name ?? 'Error');
    details.causeMessage = sanitize(error.cause.message ?? 'Error no especificado');
    if (includeStack && typeof error.cause.stack === 'string') {
      details.causeStack = sanitize(error.cause.stack);
    }
  }

  return details;
};
