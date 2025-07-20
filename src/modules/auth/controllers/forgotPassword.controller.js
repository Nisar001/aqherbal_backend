import { validateForgotPassword } from '../../../validations/user.validation.js';
import { UserModel } from '../../../models/index.js';
import { responseHelper } from '../../../helpers/index.js';
import { sendEmail } from '../../../services/email.service.js';

// ...existing code...

export const forgotPassword = async (req, res) => {
  try {
    const { error } = validateForgotPassword(req.body);
    if (error) return responseHelper.validationError(res, error.details[0].message);

    const user = await UserModel.findOne({ email: req.body.email });
    if (!user) return responseHelper.notFound(res, 'User not found');

    // Generate reset token and send email
    const resetToken = user.generateResetToken();
    await user.save();
    await sendEmail(user.email, 'Password Reset', `Your reset token: ${resetToken}`);
    // ...existing code...
    return responseHelper.success(res, { message: 'Password reset email sent' });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
