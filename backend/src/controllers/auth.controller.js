const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ════════════════════════════════════════════════════════════
//  HELPER: Tạo JWT token + gửi response về client
// ════════════════════════════════════════════════════════════

/**
 * signToken(userId)
 * Tạo JWT chứa userId, ký bằng JWT_SECRET, hết hạn sau JWT_EXPIRES_IN
 * Mặc định hết hạn sau 7 ngày nếu .env không khai báo JWT_EXPIRES_IN
 */
const signToken = (userId) =>
  jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

/**
 * sendAuthResponse(res, statusCode, user)
 * Hàm dùng chung để trả token + thông tin user về client.
 * Gọi user.toPublicJSON() từ User model → đảm bảo KHÔNG bao giờ lộ password.
 *
 * Dùng cho: register, login, updateProfile, changePassword
 */
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
 * @desc    Đăng ký tài khoản mới
 * @route   POST /api/auth/register
 * @access  Public
 *
 * Body:
 *   name     {string}  - Họ và tên (2–50 ký tự)
 *   email    {string}  - Email hợp lệ, chưa tồn tại trong DB
 *   password {string}  - Mật khẩu >= 6 ký tự
 *   role     {string}  - 'artist' hoặc 'reviewer' (admin không được tự đăng ký)
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // ── 1. Kiểm tra các trường bắt buộc ───────────────────
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: tên, email, mật khẩu',
      });
    }

    // ── 2. Chỉ cho phép artist hoặc reviewer tự đăng ký ──
    // Nếu gửi role không hợp lệ → mặc định về 'artist'
    const ALLOWED_ROLES = ['artist', 'reviewer'];
    const userRole = ALLOWED_ROLES.includes(role) ? role : 'artist';

    // ── 3. Kiểm tra email đã tồn tại chưa ─────────────────
    // Kiểm tra trước khi tạo để trả lỗi rõ ràng hơn lỗi 11000 của MongoDB
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email này đã được sử dụng. Vui lòng chọn email khác.',
      });
    }

    // ── 4. Tạo user mới ────────────────────────────────────
    // Password sẽ được tự động hash bởi pre('save') hook trong User model
    const newUser = await User.create({
      name:     name.trim(),
      email:    email.toLowerCase().trim(),
      password,
      role:     userRole,
    });

    // ── 5. Trả token + thông tin user (không có password) ─
    sendAuthResponse(res, 201, newUser);

  } catch (error) {
    // Lỗi validation từ Mongoose (email sai định dạng, tên quá ngắn...)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    // Duplicate key — giữ lại đề phòng race condition
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
 * @desc    Đăng nhập và nhận JWT
 * @route   POST /api/auth/login
 * @access  Public
 *
 * Body:
 *   email    {string}
 *   password {string}
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── 1. Kiểm tra dữ liệu đầu vào ───────────────────────
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu',
      });
    }

    // ── 2. Tìm user theo email, bao gồm password ──────────
    // password có select: false trong schema → phải .select('+password') mới lấy được
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password');

    // ── 3. Xác minh user tồn tại và mật khẩu khớp ─────────
    // Gộp 2 điều kiện vào 1 thông báo để tránh lộ thông tin tài khoản tồn tại
    const isPasswordValid = user && (await user.comparePassword(password));
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng',
      });
    }

    // ── 4. Kiểm tra tài khoản có bị khóa không ─────────────
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
      });
    }

    // ── 5. Trả token + thông tin user ─────────────────────
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
 * @desc    Lấy thông tin của người dùng đang đăng nhập
 * @route   GET /api/auth/me
 * @access  Private (cần Bearer token)
 *
 * req.user được gán sẵn bởi middleware protect() trong auth.middleware.js
 */
const getMe = async (req, res) => {
  // req.user đã có sẵn, không cần query thêm vào DB
  res.status(200).json({
    success: true,
    user: req.user.toPublicJSON(),
  });
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 4: CẬP NHẬT HỒ SƠ CÁ NHÂN
// ════════════════════════════════════════════════════════════

/**
 * @desc    Cập nhật name và bio của người dùng hiện tại
 * @route   PATCH /api/auth/update-profile
 * @access  Private
 *
 * Body (tất cả đều tuỳ chọn, gửi field nào thì cập nhật field đó):
 *   name  {string}  - Tên mới
 *   bio   {string}  - Giới thiệu bản thân mới
 */
const updateProfile = async (req, res) => {
  try {
    // Chỉ cho phép cập nhật những field an toàn
    // KHÔNG cho cập nhật password, role, reputationScore qua route này
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

    // { new: true }           → trả về document MỚI sau khi cập nhật
    // { runValidators: true } → chạy lại validation trong schema (vd: maxlength)
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
 * @desc    Đổi mật khẩu của người dùng hiện tại
 * @route   PATCH /api/auth/change-password
 * @access  Private
 *
 * Body:
 *   currentPassword {string}  - Mật khẩu hiện tại (để xác nhận là chính chủ)
 *   newPassword     {string}  - Mật khẩu mới >= 6 ký tự
 *   confirmPassword {string}  - Nhập lại mật khẩu mới (phải giống newPassword)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // ── 1. Kiểm tra dữ liệu đầu vào ───────────────────────
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đủ: currentPassword, newPassword, confirmPassword',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu xác nhận không khớp',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
      });
    }

    // ── 2. Lấy user kèm password (select: false → phải .select('+password')) ─
    const user = await User.findById(req.user._id).select('+password');

    // ── 3. Xác nhận mật khẩu hiện tại ─────────────────────
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng',
      });
    }

    // ── 4. Cập nhật mật khẩu mới ──────────────────────────
    // Dùng .save() thay vì findByIdAndUpdate() để kích hoạt pre('save') hook:
    //   → Hash mật khẩu mới
    //   → Ghi lại passwordChangedAt (vô hiệu hóa token cũ)
    user.password = newPassword;
    await user.save();

    // ── 5. Cấp token mới để user không phải đăng nhập lại ─
    sendAuthResponse(res, 200, user);

  } catch (error) {
    console.error('[changePassword]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại' });
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
};
