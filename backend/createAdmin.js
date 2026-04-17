require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Đã kết nối MongoDB');

  const existing = await User.findOne({ email: 'admin@soundjudge.com' });
  if (existing) {
    console.log('⚠️  Tài khoản admin đã tồn tại');
    process.exit(0);
  }

  await User.create({
    name:     'Admin',
    email:    'admin@soundjudge.com',
    password: 'admin123456',   // ← đổi mật khẩu tuỳ ý
    role:     'admin',
  });

  console.log('🎉 Tạo admin thành công!');
  console.log('   Email   : admin@soundjudge.com');
  console.log('   Password: admin123456');
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });