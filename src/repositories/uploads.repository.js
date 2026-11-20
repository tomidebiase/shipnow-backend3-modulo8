import UserModel from '../models/user.model.js';
import DeliveryModel from '../models/delivery.model.js';

export const uploadsRepository = {
  getUser(id) {
    return UserModel.findById(id).select('_id').lean();
  },
  getDelivery(id) {
    return DeliveryModel.findById(id).select('_id').lean();
  },
  appendUserDocument(id, metadata) {
    return UserModel.findByIdAndUpdate(
      id,
      { $push: { documents: metadata } },
      { new: true, runValidators: true }
    ).lean();
  },
  appendDeliveryProof(id, metadata) {
    return DeliveryModel.findByIdAndUpdate(
      id,
      { $push: { proofs: metadata } },
      { new: true, runValidators: true }
    ).lean();
  }
};
