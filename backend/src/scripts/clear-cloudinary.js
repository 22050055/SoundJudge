require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function wipeCloudinary() {
  try {
    console.log('☁️ Đang dọn dẹp thư mục tracks trên Cloudinary...');
    await cloudinary.api.delete_resources_by_prefix('music_platform/tracks', { resource_type: 'video' });
    
    console.log('☁️ Đang dọn dẹp thư mục covers trên Cloudinary...');
    await cloudinary.api.delete_resources_by_prefix('music_platform/covers', { resource_type: 'image' });
    
    console.log('✅ Đã xóa sạch file trên mây!');
  } catch (e) {
    console.error('Error', e);
  }
}
wipeCloudinary();
