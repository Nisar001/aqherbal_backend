import { UserModel } from '../../../models/index.js';
import { responseHelper } from '../../../helpers/index.js';

export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId).select('-password');
    if (!user) return responseHelper.notFound(res, 'User not found');
    return responseHelper.success(res, { user });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
