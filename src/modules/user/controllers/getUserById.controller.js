import { UserModel } from '../../../models/user.model.js';
import { successResponse, errorResponse } from '../../../helpers/response.helper.js';

export const getUserById = async (req, res) => {
  try {
    const user = await UserModel.findOne({ _id: req.params.id, isDeleted: false }).select('-password');
    if (!user) return errorResponse(res, 'User not found or deleted', 404);
    return successResponse(res, user, 'User fetched successfully');
  } catch (err) {
    return errorResponse(res, err.message);
  }
};
