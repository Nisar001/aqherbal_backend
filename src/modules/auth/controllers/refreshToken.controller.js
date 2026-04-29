import { responseHelper } from '../../../helpers/index.js';
import { generateToken } from '../../../utils/token.js';
import { UserModel } from '../../../models/index.js';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/config.js';

// ...existing code...

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken;
    if (!refreshToken) {
      return responseHelper.unauthorized(res, 'Refresh token required');
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwtSecret);
    } catch {
      return responseHelper.unauthorized(res, 'Invalid refresh token');
    }

    const userId = decoded._id || decoded.id || decoded.userId;
    const user = await UserModel.findById(userId);
    if (!user) return responseHelper.notFound(res, 'User not found');
    const token = generateToken({ _id: user._id, id: user._id.toString(), role: user.role, email: user.email });
    return res.status(200).json({ token });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
