// Removed incorrect import of User
import { responseHelper } from '../../../helpers/index.js';
import { sendEmail } from '../../../services/email.service.js';
import { UserModel } from '../../../models/index.js';

export const sendVerificationEmail = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    if (!user) return responseHelper.notFound(res, 'User not found');
    // Generate verification token
    user.emailVerificationToken = Math.random().toString(36).substring(2, 15);
    await user.save();
    await sendEmail(user.email, 'Verify Email', `Your verification token: ${user.emailVerificationToken}`);
    return responseHelper.success(res, { message: 'Verification email sent' });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
