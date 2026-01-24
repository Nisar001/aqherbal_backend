import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String
});


const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String },
  countryCode: { type: String },
  address: addressSchema,
  role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
  isActive: { type: Boolean, default: true },
  resetToken: { type: String },
  resetTokenExpires: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

userSchema.index({ role: 1 });
userSchema.index({ isDeleted: 1 });

const UserModel = mongoose.model('User', userSchema);

export { UserModel };
export default UserModel;
