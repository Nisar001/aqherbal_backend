import { validateLogin } from '../../../validations/user.validation.js';
import { responseHelper } from '../../../helpers/index.js';
import { sendLoginAlertEmail } from '../../../services/email.service.js';
import { AuthService } from '../../../services/auth.service.js';

const loginAttempts = new Map();
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 60 * 1000;

const getAttemptKey = (req) => `${req.userIp || req.ip}:${String(req.body?.email || '').toLowerCase()}`;

const getAttemptState = (key) => {
  const now = Date.now();
  const state = loginAttempts.get(key);
  if (!state || now - state.firstAttemptAt > LOGIN_ATTEMPT_WINDOW_MS) {
    const fresh = { count: 0, firstAttemptAt: now };
    loginAttempts.set(key, fresh);
    return fresh;
  }
  return state;
};

export const login = async (req, res, next) => {
  const attemptKey = getAttemptKey(req);

  try {
    const { error } = validateLogin(req.body);
    if (error) return responseHelper.validationError(res, error.details[0].message);

    const attemptState = getAttemptState(attemptKey);
    res.setHeader('x-ratelimit-limit', String(LOGIN_ATTEMPT_LIMIT));
    res.setHeader('x-ratelimit-remaining', String(Math.max(0, LOGIN_ATTEMPT_LIMIT - attemptState.count)));

    if (attemptState.count >= LOGIN_ATTEMPT_LIMIT) {
      return res.status(429).json({ success: false, message: 'Too many auth attempts. Please slow down.' });
    }

    const { token, user } = await AuthService.login(
      req.body.email,
      req.body.password,
      req.userIp || req.ip
    );

    try {
      await sendLoginAlertEmail({
        to: user.email,
        name: user.name,
        email: user.email,
        ip: req.userIp || req.ip
      });
    } catch {
      // Ignore alert-email failures during login.
    }

    loginAttempts.delete(attemptKey);
    return res.status(200).json({ token, user });
  } catch (err) {
    const attemptState = getAttemptState(attemptKey);
    attemptState.count += 1;
    loginAttempts.set(attemptKey, attemptState);
    next(err);
  }
};
