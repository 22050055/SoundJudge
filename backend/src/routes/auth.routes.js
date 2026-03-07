const router  = require('express').Router();
const { body, validationResult } = require('express-validator');

const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/auth.controller');

const { protect } = require('../middleware/auth');


// ════════════════════════════════════════════════════════════
//  HELPER: Middleware kiểm tra kết quả validation
// ════════════════════════════════════════════════════════════

/**
 * validate
 * Middleware trung gian: chạy sau các express-validator rules,
 * nếu có lỗi thì trả 400 ngay, không để request đi vào controller.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Chỉ lấy thông báo lỗi đầu tiên để response gọn
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }
  next();
};


// ════════════════════════════════════════════════════════════
//  VALIDATION RULES (tái sử dụng qua nhiều route)
// ════════════════════════════════════════════════════════════

/** Quy tắc kiểm tra email */
const emailRules = () =>
  body('email')
    .notEmpty().withMessage('Email không được để trống')
    .isEmail().withMessage('Email không đúng định dạng')
    .normalizeEmail();

/** Quy tắc kiểm tra mật khẩu khi đăng ký / đặt mật khẩu mới */
const passwordRules = (fieldName = 'password') =>
  body(fieldName)
    .notEmpty().withMessage('Mật khẩu không được để trống')
    .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự');

/** Quy tắc kiểm tra họ tên */
const nameRules = () =>
  body('name')
    .notEmpty().withMessage('Tên không được để trống')
    .trim()
    .isLength({ min: 2 }).withMessage('Tên phải có ít nhất 2 ký tự')
    .isLength({ max: 50 }).withMessage('Tên không được vượt quá 50 ký tự');


// ════════════════════════════════════════════════════════════
//  SWAGGER TAGS
// ════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Đăng ký, đăng nhập, quản lý tài khoản
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     UserPublic:
 *       type: object
 *       properties:
 *         id:             { type: string, example: "64abc123..." }
 *         name:           { type: string, example: "Nguyễn Văn A" }
 *         email:          { type: string, example: "a@example.com" }
 *         role:           { type: string, enum: [artist, reviewer, admin] }
 *         avatarUrl:      { type: string }
 *         bio:            { type: string }
 *         reputationScore:{ type: number }
 *         totalReviews:   { type: number }
 *         isActive:       { type: boolean }
 *         createdAt:      { type: string, format: date-time }
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         token:   { type: string, example: "eyJhbGci..." }
 *         user:    { $ref: '#/components/schemas/UserPublic' }
 */


// ════════════════════════════════════════════════════════════
//  ROUTE 1: ĐĂNG KÝ
// ════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:     { type: string, example: "Nguyễn Văn A" }
 *               email:    { type: string, example: "a@example.com" }
 *               password: { type: string, example: "matkhau123" }
 *               role:     { type: string, enum: [artist, reviewer], default: artist }
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       409:
 *         description: Email đã tồn tại
 */
router.post(
  '/register',
  [
    nameRules(),
    emailRules(),
    passwordRules('password'),
    body('role')
      .optional()
      .isIn(['artist', 'reviewer'])
      .withMessage('Role chỉ được là: artist hoặc reviewer'),
  ],
  validate,
  register
);


// ════════════════════════════════════════════════════════════
//  ROUTE 2: ĐĂNG NHẬP
// ════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập và nhận JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: "a@example.com" }
 *               password: { type: string, example: "matkhau123" }
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Thiếu email hoặc mật khẩu
 *       401:
 *         description: Sai email hoặc mật khẩu
 *       403:
 *         description: Tài khoản bị khóa
 */
router.post(
  '/login',
  [
    emailRules(),
    body('password').notEmpty().withMessage('Mật khẩu không được để trống'),
  ],
  validate,
  login
);


// ════════════════════════════════════════════════════════════
//  ROUTE 3: LẤY THÔNG TIN BẢN THÂN  [CẦN TOKEN]
// ════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Lấy thông tin người dùng đang đăng nhập
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 user:    { $ref: '#/components/schemas/UserPublic' }
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 */
router.get('/me', protect, getMe);


// ════════════════════════════════════════════════════════════
//  ROUTE 4: CẬP NHẬT HỒ SƠ  [CẦN TOKEN]
// ════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/auth/update-profile:
 *   patch:
 *     summary: Cập nhật tên và giới thiệu bản thân
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Tên mới" }
 *               bio:  { type: string, example: "Giới thiệu mới..." }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Không có trường nào được gửi lên
 *       401:
 *         description: Chưa đăng nhập
 */
router.patch(
  '/update-profile',
  protect,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2 }).withMessage('Tên phải có ít nhất 2 ký tự')
      .isLength({ max: 50 }).withMessage('Tên không được vượt quá 50 ký tự'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 300 }).withMessage('Giới thiệu không được vượt quá 300 ký tự'),
  ],
  validate,
  updateProfile
);


// ════════════════════════════════════════════════════════════
//  ROUTE 5: ĐỔI MẬT KHẨU  [CẦN TOKEN]
// ════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/auth/change-password:
 *   patch:
 *     summary: Đổi mật khẩu (yêu cầu xác nhận mật khẩu cũ)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword:     { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công, trả về token mới
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Mật khẩu hiện tại không đúng
 */
router.patch(
  '/change-password',
  protect,
  [
    body('currentPassword')
      .notEmpty().withMessage('Vui lòng nhập mật khẩu hiện tại'),
    passwordRules('newPassword'),
    body('confirmPassword')
      .notEmpty().withMessage('Vui lòng nhập lại mật khẩu mới'),
  ],
  validate,
  changePassword
);


// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = router;
