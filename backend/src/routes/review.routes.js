const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { protect, authorize, optionalProtect } = require('../middleware/auth');
const {
  submitReview,
  getReviewsByTrack,
  getMyReviews,
  reportReview,
} = require('../controllers/review.controller');


// ════════════════════════════════════════════════════════════
//  HELPER VALIDATION
// ════════════════════════════════════════════════════════════
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

const scoresRules = () =>
  body('scores').custom((scores) => {
    const KEYS = ['melody', 'lyrics', 'harmony', 'rhythm', 'production'];
    if (!scores || typeof scores !== 'object') throw new Error('scores phải là object chứa 5 tiêu chí');
    for (const key of KEYS) {
      const val = scores[key];
      if (val === undefined || val === null) throw new Error(`Thiếu điểm tiêu chí "${key}"`);
      const num = Number(val);
      if (isNaN(num) || num < 1 || num > 10) throw new Error(`Điểm "${key}" phải là số từ 1 đến 10`);
    }
    return true;
  });


// ════════════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════════════

// POST /api/reviews — Bất kỳ user nào cũng gửi được đánh giá (cần đăng nhập)
router.post(
  '/',
  protect,
  authorize('user', 'admin'),
  [
    body('trackId').notEmpty().withMessage('trackId không được để trống').isMongoId().withMessage('trackId không đúng định dạng'),
    scoresRules(),
    body('comment').notEmpty().withMessage('Nhận xét không được để trống').trim()
      .isLength({ min: 20 }).withMessage('Nhận xét phải có ít nhất 20 ký tự')
      .isLength({ max: 2000 }).withMessage('Nhận xét không được vượt quá 2000 ký tự'),
    body('timeMarkers').optional().isArray().withMessage('timeMarkers phải là mảng'),
  ],
  validate,
  submitReview
);

// GET /api/reviews/my — Lịch sử review của bản thân (cần đăng nhập)
router.get('/my', protect, getMyReviews);

// GET /api/reviews/track/:trackId — Reviews của một bài nhạc (Public)
router.get('/track/:trackId', optionalProtect, getReviewsByTrack);

// POST /api/reviews/:id/report — Báo cáo review
router.post(
  '/:id/report',
  protect,
  authorize('user'),
  [
    body('reason').notEmpty().withMessage('Vui lòng chọn lý do báo cáo'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Mô tả tối đa 500 ký tự'),
  ],
  validate,
  reportReview
);


module.exports = router;
