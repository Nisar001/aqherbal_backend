import { UserModel } from '../../../models/index.js';
import { responseHelper } from '../../../helpers/index.js';

export const listUsers = async (req, res) => {
  try {
    // Only admin can list all users
    if (!req.user || req.user.role !== 'admin') {
      return responseHelper.forbidden(res, 'Access denied');
    }
    const users = await UserModel.find({ isDeleted: false }).select('-password');
    return responseHelper.success(res, { users });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
