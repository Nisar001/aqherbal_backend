
// Removed incorrect import of User
import { responseHelper } from '../../../helpers/index.js';
import { sendNotificationEmail } from '../../../services/email.service.js';
import { UserModel } from '../../../models/index.js';

export const verifyEmail = async (req, res) => {
  try {
    const token = req.query?.token || req.body?.token;
    const user = await UserModel.findOne({
      $or: [
        { emailVerificationToken: token },
        { verificationToken: token }
      ],
      isDeleted: false
    });
    if (!user) return responseHelper.validationError(res, 'Invalid, expired, or deleted token');
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.verificationToken = undefined;
    await user.save();
    await sendNotificationEmail({ to: user.email, message: 'Your email has been verified successfully.' });
    return responseHelper.success(res, null, 'Email verified successfully');
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
