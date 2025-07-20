
import { validateLogin } from '../../../validations/user.validation.js';
// Removed incorrect import of User
import { responseHelper } from '../../../helpers/index.js';
import { UserModel } from '../../../models/index.js';
import { generateToken } from '../../../utils/token.js';
// ...existing code...
import { sendLoginAlertEmail } from '../../../services/email.service.js';

export const login = async (req, res) => {
  try {
    const { error } = validateLogin(req.body);
    if (error) return responseHelper.validationError(res, error.details[0].message);

    const user = await UserModel.findOne({ email: req.body.email, isDeleted: false });
    if (!user) return responseHelper.notFound(res, 'User not found or deleted');

    // Use utility function for password comparison
    const { comparePassword } = await import('../../../utils/password.js');
    const isMatch = await comparePassword(req.body.password, user.password);
    if (!isMatch) return responseHelper.unauthorized(res, 'Invalid credentials');

    // Generate token
    const token = generateToken({ _id: user._id, role: user.role });
    // Send login alert email
    await sendLoginAlertEmail({ to: user.email, name: user.name, email: user.email, ip: req.ip });
    // ...existing code...
    user.password = undefined; // Remove password from user object
    return responseHelper.success(res, { token, user });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
