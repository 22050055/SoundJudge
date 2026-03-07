const Review = require('../models/Review');
const Track  = require('../models/Track');
const User   = require('../models/User');

// ════════════════════════════════════════════════════════════
//  CONTROLLER 1: REVIEWER GỬI ĐÁNH GIÁ
// ════════════════════════════════════════════════════════════

/**
 * @desc    Reviewer gửi đánh giá cho một bài nhạc
 * @route   POST /api/reviews
 * @access  Private — chỉ Reviewer
 *
 * Body:
 *   trackId     {string}  - ID của bài nhạc cần đánh giá
 *   scores      {object}  - { melody, lyrics, harmony, rhythm, production } (1–10)
 *   comment     {string}  - Nhận xét văn bản (tối thiểu 20 ký tự)
 *   timeMarkers {array}   - Tuỳ chọn: [{ atSecond: number, note: string }]
 */
const submitReview = async (req, res) => {
  try {
    const { trackId, scores, comment, timeMarkers } = req.body;

    // ── 1. Kiểm tra dữ liệu bắt buộc ─────────────────────
    if (!trackId || !scores || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: trackId, scores, comment',
      });
    }

    // ── 2. Kiểm tra bài nhạc tồn tại và đang chờ review ──
    const track = await Track.findById(trackId);
    if (!track) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài nhạc' });
    }

    if (track.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Bài nhạc này đã hoàn tất đánh giá, không thể gửi thêm review',
      });
    }

    // ── 3. Kiểm tra reviewer đã review bài này chưa ───────
    // (Unique index { track, reviewer } trong schema cũng sẽ bắt lỗi 11000)
    const existingReview = await Review.findOne({
      track:    trackId,
      reviewer: req.user._id,
    });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã gửi đánh giá cho bài nhạc này rồi',
      });
    }

    // ── 4. Tạo review ─────────────────────────────────────
    // overallScore sẽ được tự động tính bởi pre('save') hook trong Review model
    const review = await Review.create({
      track:       trackId,
      reviewer:    req.user._id,
      scores,
      comment:     comment.trim(),
      timeMarkers: timeMarkers || [],
      // status mặc định là 'pending', chờ Admin duyệt
    });

    // ── 5. Cập nhật trạng thái track sang 'reviewing' ─────
    // Khi có review đầu tiên, track chuyển từ 'pending' → 'reviewing'
    if (track.status === 'pending') {
      track.status = 'reviewing';
      await track.save();
    }

    res.status(201).json({
      success: true,
      message: 'Đánh giá đã được gửi thành công, đang chờ Admin duyệt',
      review,
    });

  } catch (error) {
    // Lỗi duplicate key từ unique index trong schema
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã gửi đánh giá cho bài nhạc này rồi',
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID bài nhạc không hợp lệ' });
    }
    console.error('[submitReview]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi đánh giá' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 2: LẤY REVIEW ĐÃ DUYỆT CỦA MỘT TRACK
// ════════════════════════════════════════════════════════════

/**
 * @desc    Lấy danh sách review đã được Admin duyệt của một bài nhạc
 * @route   GET /api/reviews/track/:trackId
 * @access  Private — tất cả role
 */
const getReviewsByTrack = async (req, res) => {
  try {
    const { trackId } = req.params;

    // Kiểm tra track tồn tại
    const trackExists = await Track.exists({ _id: trackId });
    if (!trackExists) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài nhạc' });
    }

    const reviews = await Review.find({ track: trackId, status: 'approved' })
      .populate('reviewer', 'name avatarUrl reputationScore totalReviews')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID bài nhạc không hợp lệ' });
    }
    console.error('[getReviewsByTrack]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 3: LẤY DANH SÁCH REVIEW ĐANG CHỜ DUYỆT (Admin)
// ════════════════════════════════════════════════════════════

/**
 * @desc    Admin xem tất cả review đang chờ duyệt
 * @route   GET /api/reviews/pending
 * @access  Private — chỉ Admin
 *
 * Query params:
 *   page  {number} - Phân trang (mặc định: 1)
 *   limit {number} - Số item mỗi trang (mặc định: 20)
 */
const getPendingReviews = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip  = (page - 1) * limit;

    const total = await Review.countDocuments({ status: 'pending' });

    const reviews = await Review.find({ status: 'pending' })
      .populate('track',    'title coverUrl genre status')
      .populate('reviewer', 'name avatarUrl reputationScore')
      .sort({ createdAt: -1 }) // review mới nhất lên trước
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('[getPendingReviews]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 4: ADMIN DUYỆT REVIEW
// ════════════════════════════════════════════════════════════

/**
 * @desc    Admin duyệt một review → tự động chạy Rating Engine cập nhật điểm Track
 * @route   PATCH /api/reviews/:id/approve
 * @access  Private — chỉ Admin
 *
 * Sau khi duyệt:
 *   1. Review.status = 'approved'
 *   2. Gọi Review.calcTrackScore() (static method) để tính lại điểm tổng hợp
 *   3. Cập nhật Track: averageScore, scoreBreakdown, reviewCount, status
 *   4. Tăng reputationScore và totalReviews của Reviewer (+5 điểm)
 */
const approveReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy review' });
    }

    if (review.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Review này đã được xử lý rồi (status hiện tại: ${review.status})`,
      });
    }

    // ── Bước 1: Cập nhật status review ───────────────────
    review.status = 'approved';
    await review.save();

    // ── Bước 2: Chạy Rating Engine ────────────────────────
    // Review.calcTrackScore() là static method trong Review model
    // Dùng MongoDB Aggregation để tính trung bình từng tiêu chí chính xác nhất
    const scoreData = await Review.calcTrackScore(review.track);

    // ── Bước 3: Cập nhật điểm vào Track ──────────────────
    const track = await Track.findById(review.track);

    track.reviewCount    = scoreData.reviewCount;
    track.scoreBreakdown = scoreData.scoreBreakdown;
    track.averageScore   = scoreData.averageScore;

    // Tự động chuyển sang 'completed' khi đủ 3 review được duyệt
    if (scoreData.reviewCount >= 3 && track.status !== 'completed') {
      track.status = 'completed';
    }

    await track.save();

    // ── Bước 4: Tăng điểm uy tín cho Reviewer ────────────
    await User.findByIdAndUpdate(review.reviewer, {
      $inc: { reputationScore: 5, totalReviews: 1 },
    });

    res.status(200).json({
      success: true,
      message: 'Review đã được duyệt và điểm Track đã cập nhật',
      review,
      trackUpdated: {
        _id:            track._id,
        title:          track.title,
        status:         track.status,
        averageScore:   track.averageScore,
        reviewCount:    track.reviewCount,
        scoreBreakdown: track.scoreBreakdown,
      },
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID review không hợp lệ' });
    }
    console.error('[approveReview]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi duyệt review' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 5: ADMIN TỪ CHỐI REVIEW
// ════════════════════════════════════════════════════════════

/**
 * @desc    Admin từ chối một review (vi phạm tiêu chuẩn, spam...)
 * @route   PATCH /api/reviews/:id/reject
 * @access  Private — chỉ Admin
 *
 * Body:
 *   reason {string} - Lý do từ chối (tuỳ chọn nhưng nên có)
 */
const rejectReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy review' });
    }

    if (review.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Review này đã được xử lý rồi (status hiện tại: ${review.status})`,
      });
    }

    review.status          = 'rejected';
    review.rejectionReason = req.body.reason?.trim() || '';
    await review.save();

    // Nếu track vẫn là 'reviewing' nhưng không còn review nào pending nữa
    // → kiểm tra xem có còn review pending/approved không, nếu 0 thì về 'pending'
    const remainingReviews = await Review.countDocuments({
      track:  review.track,
      status: { $in: ['pending', 'approved'] },
    });

    if (remainingReviews === 0) {
      await Track.findByIdAndUpdate(review.track, { status: 'pending' });
    }

    res.status(200).json({
      success: true,
      message: 'Review đã bị từ chối',
      review,
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID review không hợp lệ' });
    }
    console.error('[rejectReview]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi từ chối review' });
  }
};


// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = {
  submitReview,
  getReviewsByTrack,
  getPendingReviews,
  approveReview,
  rejectReview,
};
