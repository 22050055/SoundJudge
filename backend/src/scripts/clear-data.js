require('dotenv').config();
const mongoose = require('mongoose');

const Track = require('../models/Track');
const Review = require('../models/Review');
const Report = require('../models/Report');
const { cloudinary } = require('../config/cloudinary');

const clearData = async () => {
  try {
    console.log('🔄 Đang kết nối tới Database để dọn dẹp...');
    
    const DB_URI = 'mongodb://22050055_db_user:khang123@ac-d6rjy8v-shard-00-00.e2kn7mt.mongodb.net:27017,ac-d6rjy8v-shard-00-01.e2kn7mt.mongodb.net:27017,ac-d6rjy8v-shard-00-02.e2kn7mt.mongodb.net:27017/?ssl=true&replicaSet=atlas-d6rjy8v-shard-0&authSource=admin&retryWrites=true&w=majority&appName=khang1402';
    
    await mongoose.connect(DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Đã kết nối DB!');

    console.log('🧹 Đang tiến hành xóa sạch dữ liệu nhạc, đánh giá và báo cáo...');
    
    // Xóa file trên Cloudinary trước
    const tracks = await Track.find({});
    console.log(`☁️ Đang xóa ${tracks.length} file nhạc trên Cloudinary...`);
    let audioDeleted = 0;
    let coverDeleted = 0;

    for (const track of tracks) {
      if (track.audioPublicId) {
        await cloudinary.uploader.destroy(track.audioPublicId, { resource_type: 'video' }).catch(() => {});
        audioDeleted++;
      }
      if (track.coverPublicId) {
        await cloudinary.uploader.destroy(track.coverPublicId, { resource_type: 'image' }).catch(() => {});
        coverDeleted++;
      }
    }
    console.log(`☁️ Đã xóa thành công ${audioDeleted} audio và ${coverDeleted} cover trên Cloudinary`);

    const trackRes = await Track.deleteMany({});
    console.log(`🗑️ Đã xóa ${trackRes.deletedCount} bài nhạc (Tracks)`);

    const reviewRes = await Review.deleteMany({});
    console.log(`🗑️ Đã xóa ${reviewRes.deletedCount} bài đánh giá (Reviews)`);

    const reportRes = await Report.deleteMany({});
    console.log(`🗑️ Đã xóa ${reportRes.deletedCount} báo cáo (Reports)`);

    console.log('🎉 XÓA DỮ LIỆU HOÀN TẤT. Hệ thống chỉ còn giữ lại tài khoản User!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi dọn dẹp dữ liệu:', error);
    process.exit(1);
  }
};

clearData();
