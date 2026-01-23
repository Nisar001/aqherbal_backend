
import { validateLogin } from '../../../validations/user.validation.js';
import { responseHelper } from '../../../helpers/index.js';
import { sendLoginAlertEmail } from '../../../services/email.service.js';
import { AuthService } from '../../../services/auth.service.js';

export const login = async (req, res, next) => {
  try {
    const { error } = validateLogin(req.body);
    if (error) return responseHelper.validationError(res, error.details[0].message);

    const { token, user } = await AuthService.login(req.body.email, req.body.password, req.userIp || req.ip);
    await sendLoginAlertEmail({ to: user.email, name: user.name, email: user.email, ip: req.userIp || req.ip });
    return responseHelper.success(res, { token, user });
  } catch (err) {
    next(err);
  }
};
