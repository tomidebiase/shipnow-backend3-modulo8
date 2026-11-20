import { InvalidInputError } from '../errors/domain-errors.js';

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 50;
export const MAX_PAGE_NUMBER = 1000;

const readPositiveInt = (value, fallback, max, name) => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new InvalidInputError(`${name} debe ser un entero positivo`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > max) {
    throw new InvalidInputError(`${name} debe estar entre 1 y ${max}`);
  }
  return parsed;
};

export const parsePagination = (query = {}, { allowed = [] } = {}) => {
  if (!query || typeof query !== 'object' || Array.isArray(query)) {
    throw new InvalidInputError('Los parámetros de búsqueda son inválidos');
  }
  const names = new Set(['page', 'limit', ...allowed]);
  if (Object.keys(query).some(key => !names.has(key))) {
    throw new InvalidInputError('La consulta contiene parámetros no permitidos');
  }
  return {
    page: readPositiveInt(query.page, 1, MAX_PAGE_NUMBER, 'page'),
    limit: readPositiveInt(query.limit, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, 'limit')
  };
};

export const paginateItems = (records, { page, limit }) => ({
  items: records.slice(0, limit),
  pagination: { page, limit, hasNext: records.length > limit }
});
