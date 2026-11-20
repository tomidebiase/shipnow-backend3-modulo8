import DeliveryModel from '../models/delivery.model.js';

export const deliveriesRepository = {
  findAll(filters = {}, { page, limit }) {
    return DeliveryModel.find(filters)
      .select('_id order courier trackingCode status createdAt updatedAt')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .lean();
  },
  findById(id) {
    return DeliveryModel.findById(id).lean();
  }
};
