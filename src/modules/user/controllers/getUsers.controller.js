import { UserModel } from '../../../models/index.js';
import { responseHelper } from '../../../helpers/index.js';

export const getUsers = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return responseHelper.forbidden(res, 'Access denied');
    }
    const user = await UserModel.findOne({ _id: req.user._id, isDeleted: false }).select('-password');
    if (!user) return responseHelper.notFound(res, 'Admin user not found or deleted');
    return responseHelper.success(res, { user });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
