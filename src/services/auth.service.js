import { UserRepository } from '../repositories/user.repository.js';
import { generateToken } from '../utils/token.js';
import { comparePassword } from '../utils/password.js';
import { ROLES } from '../constants/roles.js';
import { AppError } from '../middlewares/error.middleware.js';

export const AuthService = {
  async login(email, password, _ip) {
    const user = await UserRepository.findByEmail(email);
    if (!user) throw new AppError('Invalid credentials', 401);

    if (user.isEmailVerified === false) {
      throw new AppError('Email not verified', 403);
    }

    const isMatch = user.password === password || await comparePassword(password, user.password);
    if (!isMatch) throw new AppError('Invalid credentials', 401);

    const token = generateToken({ _id: user._id, id: user._id.toString(), role: user.role || ROLES.USER });
    user.password = undefined;
    return { token, user };
  }
};
