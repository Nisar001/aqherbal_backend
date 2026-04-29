import { validateForgotPassword } from '../../../validations/user.validation.js';
import { UserModel } from '../../../models/index.js';
import { responseHelper } from '../../../helpers/index.js';
import { sendEmail } from '../../../services/email.service.js';

// ...existing code...

export const forgotPassword = async (req, res) => {
  try {
    const { error } = validateForgotPassword(req.body);
    if (error) return responseHelper.validationError(res, error.details[0].message);

    const user = await UserModel.findOne({ email: req.body.email, isDeleted: false });
    if (!user) {
      return responseHelper.success(res, null, 'Password reset email sent');
    }

    const resetToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    user.resetToken = resetToken;
    user.resetPasswordToken = resetToken;
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    user.resetPasswordExpires = user.resetTokenExpires;
    await user.save();
    await sendEmail({
      to: user.email,
      subject: 'Password Reset',
      html: `Your reset token: ${resetToken}`
    });
    return responseHelper.success(res, null, 'Password reset email sent');
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
