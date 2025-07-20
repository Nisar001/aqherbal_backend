import { responseHelper } from '../../../helpers/index.js';
import { generateToken } from '../../../utils/token.js';
import { UserModel } from '../../../models/index.js';

// ...existing code...

export const refreshToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await UserModel.findById(userId);
    if (!user) return responseHelper.notFound(res, 'User not found');
    const token = generateToken(user._id, user.role);
    // ...existing code...
    return responseHelper.success(res, { token });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
