/**
 * migrate-roles.js
 * Script chạy 1 lần để cập nhật role cũ (artist, reviewer) → user
 *
 * Chạy: node migrate-roles.js
 */
require('dotenv').config({ path: './music-platform.env' });
const mongoose = require('mongoose');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Cập nhật tất cả role 'artist' và 'reviewer' → 'user'
    const result = await usersCollection.updateMany(
      { role: { $in: ['artist', 'reviewer'] } },
      { $set: { role: 'user' } }
    );

    console.log(`✅ Đã cập nhật ${result.modifiedCount} tài khoản (artist/reviewer → user)`);

    // Xóa field reputationScore nếu có (không dùng nữa)
    const cleanup = await usersCollection.updateMany(
      { reputationScore: { $exists: true } },
      { $unset: { reputationScore: '' } }
    );
    console.log(`🧹 Đã dọn dẹp field reputationScore: ${cleanup.modifiedCount} documents`);

    // Cập nhật Track status cũ (pending, reviewing, completed → published)
    const tracksCollection = db.collection('tracks');
    const trackResult = await tracksCollection.updateMany(
      { status: { $in: ['pending', 'reviewing', 'completed'] } },
      { $set: { status: 'published' } }
    );
    console.log(`✅ Đã cập nhật ${trackResult.modifiedCount} track (pending/reviewing/completed → published)`);

    // Cập nhật Review status cũ
    const reviewsCollection = db.collection('reviews');
    const reviewResult = await reviewsCollection.updateMany(
      { status: { $in: ['pending', 'rejected'] } },
      { $set: { status: 'approved' } }
    );
    console.log(`✅ Đã cập nhật ${reviewResult.modifiedCount} review (pending/rejected → approved)`);

    // Xóa field rejectionReason nếu có
    await reviewsCollection.updateMany(
      { rejectionReason: { $exists: true } },
      { $unset: { rejectionReason: '' } }
    );
    console.log('🧹 Đã dọn dẹp field rejectionReason');

    console.log('\n🎉 Migration hoàn tất!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration thất bại:', error);
    process.exit(1);
  }
}

migrate();
