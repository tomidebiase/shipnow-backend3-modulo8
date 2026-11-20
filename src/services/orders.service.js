import { ordersRepository } from '../repositories/orders.repository.js';
import { parsePagination, paginateItems } from '../utils/pagination.js';
import { usersRepository } from '../repositories/users.repository.js';
import { logger } from '../config/logger.js';
import { ORDER_STATUS, ORDER_PRIORITY, USER_ROLES } from '../constants/index.js';
import { assertValidObjectId } from '../utils/object-id.js';
import {
  InvalidInputError,
  InvalidOrderStatusError,
  OrderNotFoundError,
  UserNotFoundError
} from '../errors/domain-errors.js';
import { assertValidOrderStatus, assertValidOrderPriority } from './orders.validation.js';

export { assertValidOrderStatus, assertValidOrderPriority } from './orders.validation.js';

const transitionMap = Object.freeze({
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.IN_TRANSIT]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: []
});

const ensureObject = (data, allowed) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new InvalidInputError('El cuerpo de la solicitud debe ser un objeto JSON');
  }
  if (Object.keys(data).some(key => !allowed.includes(key))) {
    throw new InvalidInputError('La solicitud contiene campos no permitidos');
  }
};

const requiredText = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InvalidInputError(`El campo ${label} es obligatorio`);
  }
  return value.trim();
};

const normalizeOrder = (data) => {
  ensureObject(data, ['user', 'description', 'deliveryAddress', 'totalAmount', 'priority']);
  assertValidObjectId(data.user);
  const description = requiredText(data.description, 'description');
  const deliveryAddress = requiredText(data.deliveryAddress, 'deliveryAddress');
  if (typeof data.totalAmount !== 'number' || !Number.isFinite(data.totalAmount) || data.totalAmount < 0) {
    throw new InvalidInputError('El importe total debe ser un número mayor o igual a cero');
  }
  return {
    user: data.user,
    description,
    deliveryAddress,
    totalAmount: data.totalAmount,
    priority: data.priority === undefined ? ORDER_PRIORITY.NORMAL : assertValidOrderPriority(data.priority),
    status: ORDER_STATUS.PENDING
  };
};

const normalizeState = (data) => {
  ensureObject(data, ['status']);
  if (Object.keys(data).length !== 1) {
    throw new InvalidInputError('El campo status es obligatorio');
  }
  return assertValidOrderStatus(data.status);
};

export const createOrdersService = (repository, { userRepository = usersRepository } = {}) => ({
  async getAll(query = {}) {
    const pagination = parsePagination(query, { allowed: ['status'] });
    const filters = query.status === undefined ? {} : { status: assertValidOrderStatus(query.status) };
    return paginateItems(await repository.findAll(filters, pagination), pagination);
  },

  async getById(id) {
    assertValidObjectId(id);
    const order = await repository.findById(id);
    if (!order) {
      logger.warning('Pedido no encontrado', { orderId: id });
      throw new OrderNotFoundError();
    }
    return order;
  },

  async create(data) {
    const normalized = normalizeOrder(data);
    const user = await userRepository.findById(normalized.user);
    if (!user) throw new UserNotFoundError();
    if (user.role !== USER_ROLES.USER) {
      throw new InvalidInputError('El pedido debe pertenecer a un usuario con rol user');
    }
    const order = await repository.create(normalized);
    logger.info('Pedido creado', { orderId: order._id?.toString(), userId: normalized.user });
    return order;
  },

  async updateStatus(id, data) {
    assertValidObjectId(id);
    const status = normalizeState(data);
    const existing = await repository.findById(id);
    if (!existing) throw new OrderNotFoundError();
    if (!transitionMap[existing.status]?.includes(status)) {
      throw new InvalidOrderStatusError();
    }
    if (await repository.hasDelivery(id)) {
      throw new InvalidOrderStatusError();
    }
    const updated = await repository.updateStatus(id, status);
    if (!updated) throw new OrderNotFoundError();
    logger.info('Estado de pedido actualizado', { orderId: id, from: existing.status, to: status });
    return updated;
  }
});

export const ordersService = createOrdersService(ordersRepository);
