const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const {
  submitReview,
  getReviewsByTrack,
  getPendingReviews,
  approveReview,
  rejectReview,
} = require('../controllers/review.controller');


// ════════════════════════════════════════════════════════════
//  HELPER VALIDATION
// ════════════════════════════════════════════════════════════

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }
  next();
};

/** Kiểm tra object scores có đủ 5 tiêu chí và giá trị hợp lệ không */
const scoresRules = () =>
  body('scores').custom((scores) => {
    const KEYS = ['melody', 'lyrics', 'harmony', 'rhythm', 'production'];
    if (!scores || typeof scores !== 'object') {
      throw new Error('scores phải là object chứa 5 tiêu chí');
    }
    for (const key of KEYS) {
      const val = scores[key];
      if (val === undefined || val === null) {
        throw new Error(`Thiếu điểm tiêu chí "${key}"`);
      }
      const num = Number(val);
      if (isNaN(num) || num < 1 || num > 10) {
        throw new Error(`Điểm "${key}" phải là số từ 1 đến 10`);
      }
    }
    return true;
  });


// ════════════════════════════════════════════════════════════
//  SWAGGER TAGS
// ════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Đánh giá bài nhạc theo 5 tiêu chí
 */


// ════════════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Reviewer gửi đánh giá cho một bài nhạc
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trackId, scores, comment]
 *             properties:
 *               trackId:
 *                 type: string
 *               scores:
 *                 type: object
 *                 properties:
 *                   melody:     { type: number, minimum: 1, maximum: 10 }
 *                   lyrics:     { type: number, minimum: 1, maximum: 10 }
 *                   harmony:    { type: number, minimum: 1, maximum: 10 }
 *                   rhythm:     { type: number, minimum: 1, maximum: 10 }
 *                   production: { type: number, minimum: 1, maximum: 10 }
 *               comment:
 *                 type: string
 *                 minLength: 20
 *               timeMarkers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     atSecond: { type: number }
 *                     note:     { type: string }
 *     responses:
 *       201: { description: Gửi đánh giá thành công }
 *       400: { description: Dữ liệu không hợp lệ hoặc đã review rồi }
 *       403: { description: Không phải Reviewer }
 */
router.post(
  '/',
  protect,
  authorize('reviewer'),     // Chỉ Reviewer được gửi đánh giá
  [
    body('trackId')
      .notEmpty().withMessage('trackId không được để trống')
      .isMongoId().withMessage('trackId không đúng định dạng'),

    scoresRules(),

    body('comment')
      .notEmpty().withMessage('Nhận xét không được để trống')
      .trim()
      .isLength({ min: 20 }).withMessage('Nhận xét phải có ít nhất 20 ký tự')
      .isLength({ max: 2000 }).withMessage('Nhận xét không được vượt quá 2000 ký tự'),

    body('timeMarkers')
      .optional()
      .isArray().withMessage('timeMarkers phải là mảng'),

    body('timeMarkers.*.atSecond')
      .optional()
      .isNumeric().withMessage('atSecond phải là số')
      .custom((val) => val >= 0).withMessage('atSecond không thể âm'),

    body('timeMarkers.*.note')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Ghi chú tối đa 200 ký tự'),
  ],
  validate,
  submitReview
);


/**
 * //@swagger//
 * /api/reviews/pending:
 *   get:
 *     summary: Admin xem danh sách review đang chờ duyệt
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page,  schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Thành công }
 *       403: { description: Không phải Admin }
 *
 * QUAN TRỌNG: Route /pending phải khai báo TRƯỚC route /:reviewId
 * vì Express đọc route theo thứ tự, nếu /:reviewId trước thì "pending"
 * sẽ bị hiểu là một MongoDB ObjectId và gây lỗi CastError.
 */
router.get(
  '/pending',
  protect,
  authorize('admin'),
  getPendingReviews
);


/**
 * @swagger
 * /api/reviews/track/{trackId}:
 *   get:
 *     summary: Lấy danh sách review đã duyệt của một bài nhạc
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: trackId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Thành công }
 *       404: { description: Không tìm thấy bài nhạc }
 */
router.get(
  '/track/:trackId',
  protect,
  getReviewsByTrack
);


/**
 * @swagger
 * /api/reviews/{id}/approve:
 *   patch:
 *     summary: Admin duyệt review → tự động cập nhật điểm Track
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Duyệt thành công, trả về review + thông tin điểm track mới }
 *       400: { description: Review đã được xử lý rồi }
 *       403: { description: Không phải Admin }
 *       404: { description: Không tìm thấy review }
 */
router.patch(
  '/:id/approve',
  protect,
  authorize('admin'),
  approveReview
);


/**
 * @swagger
 * /api/reviews/{id}/reject:
 *   patch:
 *     summary: Admin từ chối review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, description: Lý do từ chối (tuỳ chọn) }
 *     responses:
 *       200: { description: Từ chối thành công }
 *       403: { description: Không phải Admin }
 *       404: { description: Không tìm thấy review }
 */
router.patch(
  '/:id/reject',
  protect,
  authorize('admin'),
  [
    body('reason').optional().trim().isLength({ max: 500 })
      .withMessage('Lý do từ chối tối đa 500 ký tự'),
  ],
  validate,
  rejectReview
);


module.exports = router;
