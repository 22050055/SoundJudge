const mongoose = require('mongoose');

/**
 * Kết nối tới MongoDB
 * URI được lấy từ biến môi trường MONGODB_URI trong file .env
 * Ví dụ: mongodb://127.0.0.1:27017/soundjudge
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Timeout sau 5 giây nếu không tìm thấy server MongoDB
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB đã kết nối: ${conn.connection.host}`);
    console.log(`📦 Database đang dùng : ${conn.connection.name}`);

    // Mất kết nối (ví dụ: tắt MongoDB giữa chừng)
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB bị mất kết nối!');
    });

    // Kết nối lại thành công
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB đã kết nối lại');
    });

  } catch (error) {
    console.error(`❌ Lỗi kết nối MongoDB: ${error.message}`);

    // Gợi ý lỗi thường gặp
    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 Gợi ý: MongoDB chưa được khởi động trên máy.');
      console.error('   Chạy lệnh: mongod  hoặc  net start MongoDB');
    }

    // Thoát process — server không thể chạy nếu không có DB
    process.exit(1);
  }
};

module.exports = connectDB;
