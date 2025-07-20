

import { UserModel } from '../../../models/index.js';
import { responseHelper } from '../../../helpers/index.js';
import { hashPassword } from '../../../utils/password.js';
import { sendPasswordChangeEmail } from '../../../services/email.service.js';

export const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) return responseHelper.notFound(res, 'User not found or deleted');
    // Use utility function for password comparison
    const { comparePassword } = await import('../../../utils/password.js');
    const isMatch = await comparePassword(oldPassword, user.password);
    if (!isMatch) return responseHelper.unauthorized(res, 'Old password is incorrect');
    user.password = await hashPassword(newPassword);
    await user.save();
    await sendPasswordChangeEmail({ to: user.email, name: user.name, email: user.email });
    const userObj = user.toObject();
    delete userObj.password;
    return responseHelper.success(res, { message: 'Password changed successfully', user: userObj });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
