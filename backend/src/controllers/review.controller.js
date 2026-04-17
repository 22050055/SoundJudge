const Review = require('../models/Review');
const Track  = require('../models/Track');
const Report = require('../models/Report');
const User   = require('../models/User');
const Notification = require('../models/Notification');

// ════════════════════════════════════════════════════════════
//  CONTROLLER 1: GỬI ĐÁNH GIÁ
// ════════════════════════════════════════════════════════════
/**
 * @desc    User gửi đánh giá cho bài nhạc
 * @route   POST /api/reviews
 * @access  Private — user, admin
 *
 * Review tự động được approved ngay khi gửi.
 * User không được review bài của chính mình.
 */
const submitReview = async (req, res) => {
  try {
    const { trackId, scores, comment, timeMarkers } = req.body;

    if (!trackId || !scores || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: trackId, scores, comment',
      });
    }

    const track = await Track.findById(trackId);
    if (!track || track.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài nhạc' });
    }

    // Không cho tự review bài của mình
    if (track.artist.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể đánh giá bài nhạc của chính mình',
      });
    }

    // Kiểm tra đã review chưa
    const existingReview = await Review.findOne({ track: trackId, reviewer: req.user._id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Bạn đã gửi đánh giá cho bài nhạc này rồi' });
    }

    // Tạo review — status mặc định 'approved' (tự động)
    const review = await Review.create({
      track:       trackId,
      reviewer:    req.user._id,
      scores,
      comment:     comment.trim(),
      timeMarkers: timeMarkers || [],
      status:      'approved',
    });

    // Tính lại điểm track ngay lập tức
    const scoreData = await Review.calcTrackScore(trackId);
    await Track.findByIdAndUpdate(trackId, {
      reviewCount:    scoreData.reviewCount,
      scoreBreakdown: scoreData.scoreBreakdown,
      averageScore:   scoreData.averageScore,
    });

    // Tăng totalReviews của user
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalReviews: 1 } });

    // Thông báo cho nghệ sĩ ( artist) của bài nhạc
    try {
      await Notification.create({
        recipient:   track.artist,
        sender:      req.user._id,
        type:        'new_review',
        targetId:    review._id,
        targetModel: 'Review',
        message:     `${req.user.name} đã đánh giá bài nhạc của bạn: ${track.title}`,
        link:        `/dashboard/track/${track._id}`
      });
    } catch (notifErr) {
      console.error('Review notification error:', notifErr);
    }

    await review.populate('reviewer', 'name avatarUrl');

    res.status(201).json({
      success: true,
      message: 'Đánh giá đã được gửi thành công',
      review,
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Bạn đã gửi đánh giá cho bài nhạc này rồi' });
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
//  CONTROLLER 2: LẤY REVIEW CỦA MỘT TRACK
// ════════════════════════════════════════════════════════════
/**
 * @route   GET /api/reviews/track/:trackId
 * @access  Private — tất cả role
 */
const getReviewsByTrack = async (req, res) => {
  try {
    const { trackId } = req.params;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip  = (page - 1) * limit;

    const trackExists = await Track.exists({ _id: trackId, status: 'published' });
    if (!trackExists) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài nhạc' });
    }

    const total   = await Review.countDocuments({ track: trackId, status: 'approved' });
    const reviews = await Review.find({ track: trackId, status: 'approved' })
      .populate('reviewer', 'name avatarUrl totalReviews')
      .sort({ createdAt: -1 })
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
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID bài nhạc không hợp lệ' });
    }
    console.error('[getReviewsByTrack]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 3: LẤY REVIEW CỦA BẢN THÂN
// ════════════════════════════════════════════════════════════
/**
 * @route   GET /api/reviews/my
 * @access  Private — user
 */
const getMyReviews = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip  = (page - 1) * limit;

    const total   = await Review.countDocuments({ reviewer: req.user._id, status: 'approved' });
    const reviews = await Review.find({ reviewer: req.user._id, status: 'approved' })
      .populate('track', 'title coverUrl averageScore genre')
      .sort({ createdAt: -1 })
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
    console.error('[getMyReviews]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 4: BÁO CÁO REVIEW VI PHẠM
// ════════════════════════════════════════════════════════════
/**
 * @route   POST /api/reviews/:id/report
 * @access  Private — user
 */
const reportReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review || review.status !== 'approved') {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
    }

    // Không báo cáo review của chính mình
    if (review.reviewer.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Bạn không thể báo cáo đánh giá của chính mình' });
    }

    const { reason, description } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn lý do báo cáo' });
    }

    // Kiểm tra đã báo cáo chưa
    const existing = await Report.findOne({ reportedBy: req.user._id, targetId: review._id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bạn đã báo cáo đánh giá này rồi' });
    }

    await Report.create({
      targetType:  'review',
      targetId:    review._id,
      targetModel: 'Review',
      reportedBy:  req.user._id,
      reason,
      description: description?.trim() || '',
    });

    await Review.findByIdAndUpdate(review._id, { $inc: { reportCount: 1 } });

    res.status(201).json({ success: true, message: 'Báo cáo đã được gửi thành công' });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Bạn đã báo cáo đánh giá này rồi' });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID đánh giá không hợp lệ' });
    }
    console.error('[reportReview]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = {
  submitReview,
  getReviewsByTrack,
  getMyReviews,
  reportReview,
};
