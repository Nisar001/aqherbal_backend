import { UserModel } from '../../../models/index.js';
import { responseHelper } from '../../../helpers/index.js';

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;
    const user = await UserModel.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
    if (!user) return responseHelper.notFound(res, 'User not found');
    return responseHelper.success(res, { user });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
