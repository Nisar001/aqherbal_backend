import { UserModel } from '../../../models/index.js';
import { responseHelper } from '../../../helpers/index.js';

export const updateUser = async (req, res) => {
  try {
    const user = await UserModel.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, req.body, { new: true }).select('-password');
    if (!user) return responseHelper.notFound(res, 'User not found or deleted');
    return responseHelper.success(res, { user });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
