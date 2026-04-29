import { responseHelper } from '../../../helpers/index.js';
import { invalidateToken } from '../../../middlewares/auth.middleware.js';

// ...existing code...

export const logout = async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    invalidateToken(token);
    return responseHelper.success(res, null, 'logout successful');
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
