import { UserModel } from '../models/user.model.js';

export const UserRepository = {
  findByEmail: async (email) => UserModel.findOne({ email, isDeleted: false }),
  findById: async (id) => UserModel.findById(id),
  create: async (data) => UserModel.create(data),
  updateById: async (id, update) => UserModel.findByIdAndUpdate(id, update, { new: true }),
  existsByEmail: async (email) => UserModel.exists({ email, isDeleted: false })
};
