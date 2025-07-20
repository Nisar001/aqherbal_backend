import { UserModel } from '../../../models/index.js';
import { responseHelper } from '../../../helpers/index.js';
import { sendUserDeletedEmail } from '../../../services/email.service.js';

export const deleteUser = async (req, res) => {
  try {
    const user = await UserModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!user) return responseHelper.notFound(res, 'User not found or already deleted');
    user.isDeleted = true;
    await user.save();
    // Send deletion email
    await sendUserDeletedEmail({ to: user.email, name: user.name, email: user.email });
    return responseHelper.success(res, { message: 'User deleted successfully' });
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
