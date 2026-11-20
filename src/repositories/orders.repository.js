import OrderModel from '../models/order.model.js';
import DeliveryModel from '../models/delivery.model.js';

export const ordersRepository = {
  findAll(filters = {}) {
    return OrderModel.find(filters).sort({ createdAt: -1 }).lean();
  },
  findById(id) {
    return OrderModel.findById(id).lean();
  },
  create(data) {
    return OrderModel.create(data);
  },
  updateStatus(id, status) {
    return OrderModel.findByIdAndUpdate(id, { status }, { new: true, runValidators: true }).lean();
  },
  hasDelivery(id) {
    return DeliveryModel.exists({ order: id });
  }
};
