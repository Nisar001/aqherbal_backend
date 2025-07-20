
// Removed incorrect import of User
import { responseHelper } from '../../../helpers/index.js';
import { sendNotificationEmail } from '../../../services/email.service.js';

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await UserModel.findOne({ emailVerificationToken: token, isDeleted: false });
    if (!user) return responseHelper.notFound(res, 'Invalid, expired, or deleted token');
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();
    await sendNotificationEmail({ to: user.email, message: 'Your email has been verified successfully.' });
    return responseHelper.success(res, { message: 'Email verified successfully' });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
