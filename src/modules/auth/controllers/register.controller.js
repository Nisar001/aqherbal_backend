
import { validateRegister } from '../../../validations/user.validation.js';
import { UserModel } from '../../../models/index.js';
import { responseHelper } from '../../../helpers/index.js';
import { hashPassword } from '../../../utils/password.js';
import { sendRegistrationEmail, sendVerificationEmail } from '../../../services/email.service.js';

export const register = async (req, res) => {
  try {
    const { error } = validateRegister(req.body);
    if (error) return responseHelper.validationError(res, error.details[0].message);

    // Check if user exists
    const existingUser = await UserModel.findOne({ email: req.body.email, isDeleted: false });
    if (existingUser) return responseHelper.conflict(res, 'Email already registered');

    // Hash password before saving user
    const hashedPassword = await hashPassword(req.body.password);
    const user = new UserModel({ ...req.body, password: hashedPassword });
    await user.save();
    // Send registration email
    await sendRegistrationEmail({ to: user.email, name: user.name, email: user.email });
    const userObj = user.toObject();
    delete userObj.password;
    return responseHelper.created(res, { user: userObj });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
