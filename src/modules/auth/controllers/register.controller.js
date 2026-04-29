
import { validateRegister } from '../../../validations/user.validation.js';
import { UserModel } from '../../../models/index.js';
import { responseHelper } from '../../../helpers/index.js';
import { hashPassword } from '../../../utils/password.js';
import { sendRegistrationEmail } from '../../../services/email.service.js';
import { generateToken } from '../../../utils/token.js';

console.info('🔥 Inside register controller');

export const register = async (req, res) => {
  try {
    const { error } = validateRegister(req.body);
    if (error) return responseHelper.validationError(res, error.details[0].message);
    if ((req.body.name || '').length > 1000) {
      return responseHelper.validationError(res, 'Name is too long');
    }

    // Check if user exists
    const existingUser = await UserModel.findOne({ email: req.body.email, isDeleted: false });
    if (existingUser) return responseHelper.validationError(res, 'Email already registered');

    // Hash password before saving user
    const hashedPassword = await hashPassword(req.body.password);
    const user = new UserModel({ ...req.body, password: hashedPassword });
    await user.save();
    // Send registration email
    await sendRegistrationEmail({ to: user.email, name: user.name, email: user.email });
    const userObj = user.toObject();
    delete userObj.password;
    const token = generateToken({ _id: user._id, id: user._id.toString(), role: user.role, email: user.email });
    return res.status(201).json({ token, user: userObj });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
