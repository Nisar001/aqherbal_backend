
import { validateResetPassword } from '../../../validations/user.validation.js';
import { UserModel } from '../../../models/index.js';
import { responseHelper } from '../../../helpers/index.js';
import { hashPassword } from '../../../utils/password.js';
import { sendPasswordChangeEmail } from '../../../services/email.service.js';

export const resetPassword = async (req, res) => {
  try {
    const { error } = validateResetPassword(req.body);
    if (error) return responseHelper.validationError(res, error.details[0].message);

    const user = await UserModel.findOne({
      $or: [
        { resetToken: req.body.token },
        { resetPasswordToken: req.body.token }
      ],
      isDeleted: false
    });
    if (!user) return responseHelper.validationError(res, 'Invalid, expired, or deleted token');

    const expiry = user.resetPasswordExpires || user.resetTokenExpires;
    if (expiry && expiry < new Date()) {
      return responseHelper.validationError(res, 'Invalid, expired, or deleted token');
    }

    user.password = await hashPassword(req.body.password);
    user.resetToken = undefined;
    user.resetPasswordToken = undefined;
    user.resetTokenExpires = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    await sendPasswordChangeEmail({ to: user.email, name: user.name, email: user.email });
    return responseHelper.success(res, null, 'Password reset successful');
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
