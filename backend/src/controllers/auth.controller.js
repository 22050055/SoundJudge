const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ════════════════════════════════════════════════════════════
//  HELPER
// ════════════════════════════════════════════════════════════
const signToken = (userId) =>
  jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const sendAuthResponse = (res, statusCode, user) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: user.toPublicJSON(),
  });
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 1: ĐĂNG KÝ
// ════════════════════════════════════════════════════════════
/**
 * @route   POST /api/auth/register
 * @access  Public
 * Chỉ tạo được role 'user'. Admin không tự đăng ký được.
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: tên, email, mật khẩu',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email này đã được sử dụng. Vui lòng chọn email khác.',
      });
    }

    const newUser = await User.create({
      name:  name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role:  'user', // luôn là 'user', không cho tự đặt admin
    });

    sendAuthResponse(res, 201, newUser);

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });
    }
    console.error('[register]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 2: ĐĂNG NHẬP
// ════════════════════════════════════════════════════════════
/**
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password');

    const isPasswordValid = user && (await user.comparePassword(password));
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
      });
    }

    sendAuthResponse(res, 200, user);

  } catch (error) {
    console.error('[login]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 3: LẤY THÔNG TIN NGƯỜI DÙNG HIỆN TẠI
// ════════════════════════════════════════════════════════════
/**
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user.toPublicJSON(),
  });
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 4: CẬP NHẬT HỒ SƠ CÁ NHÂN
// ════════════════════════════════════════════════════════════
/**
 * @route   PATCH /api/auth/update-profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const ALLOWED_FIELDS = ['name', 'bio'];
    const updates = {};

    ALLOWED_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có thông tin nào được cập nhật. Cho phép: name, bio',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công',
      user: updatedUser.toPublicJSON(),
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error('[updateProfile]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 5: ĐỔI MẬT KHẨU
// ════════════════════════════════════════════════════════════
/**
 * @route   PATCH /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đủ: currentPassword, newPassword, confirmPassword',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu xác nhận không khớp' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    user.password = newPassword;
    await user.save();

    sendAuthResponse(res, 200, user);

  } catch (error) {
    console.error('[changePassword]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 6: XEM PROFILE NGƯỜI DÙNG BẤT KỲ
// ════════════════════════════════════════════════════════════
/**
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -passwordChangedAt')
      .populate('following', 'name avatarUrl')
      .populate('followers', 'name avatarUrl');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    res.status(200).json({ success: true, user });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
    }
    console.error('[getUserProfile]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getUserProfile,
};
