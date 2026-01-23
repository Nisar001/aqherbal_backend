import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/config.js';

cloudinary.config({
  cloud_name: config.cloudinary.name,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

export const uploadImage = async (filePath, folder = 'products') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image'
    });
    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    throw new Error('Image upload failed: ' + error.message);
  }
};

export const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error) {
    throw new Error('Image deletion failed: ' + error.message);
  }
};
