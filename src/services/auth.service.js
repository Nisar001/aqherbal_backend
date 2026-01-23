import { UserRepository } from '../repositories/user.repository.js';
import { generateToken } from '../utils/token.js';
import { comparePassword } from '../utils/password.js';
import { ROLES } from '../constants/roles.js';
import { AppError } from '../middlewares/error.middleware.js';

export const AuthService = {
  async login(email, password, _ip) {
    const user = await UserRepository.findByEmail(email);
    if (!user) throw new AppError('User not found or deleted', 404);

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) throw new AppError('Invalid credentials', 401);

    const token = generateToken({ _id: user._id, role: user.role || ROLES.USER });
    user.password = undefined;
    return { token, user };
  }
};
