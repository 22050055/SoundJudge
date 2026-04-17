// backend/src/scripts/migrate-roles.js
// Kịch bản chuyển đổi:
// 1. Roles artist, reviewer -> user
// 2. Track, Review: Thêm fields required mảng reports: []

require('dotenv').config();
const mongoose = require('mongoose');

// Kết nối DB thủ công
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('🔗 Đã kết nối DB! Bắt đầu migration...');

  try {
    const defaultImg = 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg';

    // 1. Users
    const User = require('../models/User');
    const updateUsers = await User.updateMany(
      { role: { $in: ['artist', 'reviewer'] } },
      { $set: { role: 'user' } }
    );
    console.log(`✅ Đã cập nhật ${updateUsers.modifiedCount} Users sang role "user".`);

    // Khởi tạo các mảng followers, following nếu đang trống
    const updateUsersArr = await User.updateMany(
      { followers: { $exists: false } },
      { $set: { followers: [], following: [] } }
    );
    console.log(`✅ Khởi tạo mảng follow cho ${updateUsersArr.modifiedCount} Users.`);

    // 2. Tracks
    const Track = require('../models/Track');
    const updateTracks = await Track.updateMany(
      { reports: { $exists: false } },
      { $set: { reports: [], reportCount: 0, status: 'published' } } 
      // cập nhật pending thành published theo requirement mới
    );
    console.log(`✅ Khởi tạo báo cáo cho ${updateTracks.modifiedCount} Tracks.`);

    // 3. Reviews
    const Review = require('../models/Review');
    const updateReviews = await Review.updateMany(
      { reports: { $exists: false } },
      { $set: { reports: [], reportCount: 0, status: 'approved' } }
      // Các review cũ đều được coi là approved
    );
    console.log(`✅ Khởi tạo báo cáo cho ${updateReviews.modifiedCount} Reviews.`);

    console.log('🎉 MIGRATION HOÀN TẤT!!!');
  } catch (error) {
    console.error('❌ Lỗi kết nối / cập nhật DB:', error);
  } finally {
    process.exit(0);
  }
})
.catch((err) => {
  console.error('Lỗi kết nối MongoDB:', err);
  process.exit(1);
});
