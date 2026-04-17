const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ════════════════════════════════════════════════════════════
//  MIDDLEWARE 1: XÁC THỰC TOKEN JWT
// ════════════════════════════════════════════════════════════

/**
 * protect
 * Kiểm tra Bearer token trong header Authorization.
 * Nếu hợp lệ → gán req.user = user document để controller dùng tiếp.
 *
 * Các bước kiểm tra:
 *   1. Token có tồn tại không?
 *   2. Token có được ký đúng secret không? (jwt.verify)
 *   3. User trong token có còn tồn tại trong DB không?
 *   4. Tài khoản có đang bị khóa không?
 *   5. Mật khẩu có bị đổi SAU khi token được cấp không?
 *      (dùng isPasswordChangedAfter từ User model)
 */
const protect = async (req, res, next) => {
  try {
    // ── Bước 1: Lấy token từ header ───────────────────────
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.',
      });
    }

    // ── Bước 2: Xác minh token (ký đúng secret + chưa hết hạn) ─
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      const message = jwtError.name === 'TokenExpiredError'
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : 'Token không hợp lệ. Vui lòng đăng nhập lại.';
      return res.status(401).json({ success: false, message });
    }

    // ── Bước 3: Kiểm tra user còn tồn tại trong DB không ──
    // Cần select '+passwordChangedAt' để dùng ở bước 5
    const currentUser = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không còn tồn tại.',
      });
    }

    // ── Bước 4: Kiểm tra tài khoản bị khóa ────────────────
    if (!currentUser.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
      });
    }

    // ── Bước 5: Kiểm tra mật khẩu có đổi sau khi token cấp không ─
    // Nếu user đổi mật khẩu → tất cả token cũ phải bị vô hiệu hóa
    // decoded.iat là thời điểm tạo token (đơn vị: giây)
    if (currentUser.isPasswordChangedAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu vừa được thay đổi. Vui lòng đăng nhập lại.',
      });
    }

    // ── Thành công: gán user vào request để controller dùng ─
    // Tự động mapping role cũ (artist/reviewer) sang "user" trên session memory cho những ai chưa chạy migration DB.
    if (currentUser.role === 'artist' || currentUser.role === 'reviewer') {
      currentUser.role = 'user';
    }
    req.user = currentUser;
    next();

  } catch (error) {
    console.error('[protect middleware]', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực, vui lòng thử lại',
    });
  }
};


// ════════════════════════════════════════════════════════════
//  MIDDLEWARE 2: PHÂN QUYỀN THEO ROLE
// ════════════════════════════════════════════════════════════

/**
 * authorize(...roles)
 * Factory middleware — tạo middleware kiểm tra role động.
 * Luôn dùng SAU protect() vì cần req.user đã được gán.
 *
 * Ví dụ dùng trong routes:
 *   router.post('/upload', protect, authorize('artist'), uploadTrack);
 *   router.patch('/approve', protect, authorize('admin'), approveReview);
 *
 * @param {...string} roles - Danh sách role được phép truy cập
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Vai trò "${req.user.role}" không có quyền thực hiện thao tác này. Yêu cầu: ${roles.join(' hoặc ')}.`,
      });
    }
    next();
  };
};


// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = { protect, authorize };
