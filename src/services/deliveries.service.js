import { deliveriesRepository } from '../repositories/deliveries.repository.js';
import { assertValidObjectId } from '../utils/object-id.js';
import { DeliveryNotFoundError, InvalidInputError } from '../errors/domain-errors.js';
import { DELIVERY_STATUS } from '../constants/index.js';
import { parsePagination, paginateItems } from '../utils/pagination.js';

export const createDeliveriesService = (repository) => ({
  async getAll(query = {}) {
    const pagination = parsePagination(query, { allowed: ['status'] });
    const filters = {};
    if (query.status !== undefined) {
      if (typeof query.status !== 'string' || !Object.values(DELIVERY_STATUS).includes(query.status)) {
        throw new InvalidInputError('El estado de entrega es inválido');
      }
      filters.status = query.status;
    }
    return paginateItems(await repository.findAll(filters, pagination), pagination);
  },
  async getById(id) {
    assertValidObjectId(id);
    const delivery = await repository.findById(id);
    if (!delivery) throw new DeliveryNotFoundError();
    return delivery;
  }
});

export const deliveriesService = createDeliveriesService(deliveriesRepository);
