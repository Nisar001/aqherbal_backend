import { responseHelper } from '../../../helpers/index.js';

// ...existing code...

export const logout = async (req, res) => {
  try {
    // For JWT, logout is handled client-side by deleting the token
    // ...existing code...
    return responseHelper.success(res, { message: 'Logged out successfully' });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
