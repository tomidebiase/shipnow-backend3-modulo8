import mongoose from 'mongoose';
import UserModel from '../models/user.model.js';

const detailProjection = 'firstName lastName email role documents createdAt updatedAt';
const listProjection = 'firstName lastName email role createdAt updatedAt';

export const usersRepository = {
  async findAll({ page, limit }) {
    return UserModel.find({})
      .select(listProjection)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .lean();
  },

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return UserModel.findById(id).select(detailProjection).lean();
  },

  async findByEmail(email) {
    return UserModel.findOne({ email }).select('_id email').lean();
  },

  async create(data) {
    const user = await UserModel.create(data);
    return user.toObject();
  },

  async updateById(id, data) {
    if (!mongoose.isValidObjectId(id)) return null;
    return UserModel.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .select(detailProjection)
      .lean();
  },

  async deleteById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return UserModel.findByIdAndDelete(id).select(detailProjection).lean();
  }
};
