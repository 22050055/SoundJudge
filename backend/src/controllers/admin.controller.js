const User   = require('../models/User');
const Track  = require('../models/Track');
const Review = require('../models/Review');
const Report = require('../models/Report');

// ════════════════════════════════════════════════════════════
//  CONTROLLER 1: THỐNG KÊ TỔNG QUAN (Dashboard)
// ════════════════════════════════════════════════════════════
/**
 * @route   GET /api/admin/stats
 * @access  Private — Admin
 */
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalTracks,
      totalReviews,
      pendingReports,
      usersByRoleRaw,
      tracksByStatusRaw,
      recentTracks,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      Track.countDocuments(),
      Review.countDocuments({ status: 'approved' }),
      Report.countDocuments({ status: 'pending' }),

      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      Track.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // 7 ngày gần nhất: số track upload mỗi ngày
      Track.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 7 ngày gần nhất: số user đăng ký mỗi ngày
      User.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const usersByRole    = usersByRoleRaw.reduce((acc, i) => { acc[i._id] = i.count; return acc; }, { user: 0, admin: 0 });
    const tracksByStatus = tracksByStatusRaw.reduce((acc, i) => { acc[i._id] = i.count; return acc; }, { published: 0, removed: 0 });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalTracks,
        totalReviews,
        pendingReports,
      },
      usersByRole,
      tracksByStatus,
      charts: {
        recentTracks,
        recentUsers,
      },
    });

  } catch (error) {
    console.error('[getDashboardStats]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy thống kê' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 2: DANH SÁCH NGƯỜI DÙNG
// ════════════════════════════════════════════════════════════
/**
 * @route   GET /api/admin/users
 * @access  Private — Admin
 */
const getUsers = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const { role, isActive, search } = req.query;
    const filter = {};

    if (role && ['user', 'admin'].includes(role)) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search && search.trim()) {
      filter.$or = [
        { name:  { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const skip  = (page - 1) * limit;
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const safeUsers = users.map((u) => ({
      id:             u._id,
      name:           u.name,
      email:          u.email,
      role:           u.role,
      avatarUrl:      u.avatar?.url || '',
      bio:            u.bio,
      totalTracks:    u.totalTracks || 0,
      totalReviews:   u.totalReviews || 0,
      followersCount: u.followers?.length || 0,
      followingCount: u.following?.length || 0,
      isActive:       u.isActive,
      createdAt:      u.createdAt,
    }));

    res.status(200).json({
      success: true,
      users: safeUsers,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });

  } catch (error) {
    console.error('[getUsers]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách user' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 3: KHOÁ / MỞ KHOÁ TÀI KHOẢN
// ════════════════════════════════════════════════════════════
/**
 * @route   PATCH /api/admin/users/:id/toggle
 * @access  Private — Admin
 */
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Bạn không thể khoá tài khoản của chính mình' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: user.isActive ? `Tài khoản "${user.name}" đã được mở khoá` : `Tài khoản "${user.name}" đã bị khoá`,
      user: user.toPublicJSON(),
    });

  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
    console.error('[toggleUserStatus]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 4: CHỈNH SỬA THÔNG TIN USER
// ════════════════════════════════════════════════════════════
/**
 * @route   PATCH /api/admin/users/:id
 * @access  Private — Admin
 */
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    const ALLOWED = ['name', 'bio', 'role', 'isActive'];
    const updates = {};
    ALLOWED.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (updates.role && !['user', 'admin'].includes(updates.role)) {
      return res.status(400).json({ success: false, message: 'Role không hợp lệ (user hoặc admin)' });
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: 'Cập nhật thành công', user: updated.toPublicJSON() });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs[0] });
    }
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    console.error('[updateUser]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 5: XÓA TÀI KHOẢN
// ════════════════════════════════════════════════════════════
/**
 * @route   DELETE /api/admin/users/:id
 * @access  Private — Admin
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Bạn không thể xóa tài khoản của chính mình' });
    }

    // Xóa toàn bộ track, review, report của user
    const tracks = await Track.find({ artist: user._id });
    const trackIds = tracks.map((t) => t._id);

    await Review.deleteMany({ $or: [{ reviewer: user._id }, { track: { $in: trackIds } }] });
    await Track.deleteMany({ artist: user._id });
    await Report.deleteMany({ reportedBy: user._id });

    // Xóa user khỏi following/followers của người khác
    await User.updateMany(
      { following: user._id },
      { $pull: { following: user._id } }
    );
    await User.updateMany(
      { followers: user._id },
      { $pull: { followers: user._id } }
    );

    await user.deleteOne();

    res.status(200).json({ success: true, message: `Đã xóa tài khoản "${user.name}" và toàn bộ dữ liệu liên quan` });

  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    console.error('[deleteUser]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 6: ADMIN XOÁ BÀI NHẠC
// ════════════════════════════════════════════════════════════
/**
 * @route   DELETE /api/admin/tracks/:id
 * @access  Private — Admin
 */
const deleteTrackAdmin = async (req, res) => {
  try {
    const { cloudinary } = require('../config/cloudinary');
    const track = await Track.findById(req.params.id);
    if (!track) return res.status(404).json({ success: false, message: 'Không tìm thấy bài nhạc' });

    if (track.audioPublicId) {
      try { await cloudinary.uploader.destroy(track.audioPublicId, { resource_type: 'video' }); }
      catch (e) { console.warn(e.message); }
    }
    if (track.coverPublicId) {
      try { await cloudinary.uploader.destroy(track.coverPublicId, { resource_type: 'image' }); }
      catch (e) { console.warn(e.message); }
    }

    await Review.deleteMany({ track: track._id });
    await Report.deleteMany({ targetId: track._id });
    await User.findByIdAndUpdate(track.artist, { $inc: { totalTracks: -1 } });
    await track.deleteOne();

    res.status(200).json({ success: true, message: `Đã xoá bài nhạc "${track.title}" thành công` });

  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    console.error('[deleteTrackAdmin]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 7: ADMIN XÓA REVIEW
// ════════════════════════════════════════════════════════════
/**
 * @route   DELETE /api/admin/reviews/:id
 * @access  Private — Admin
 */
const deleteReviewAdmin = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });

    const trackId    = review.track;
    const reviewerId = review.reviewer;

    // Xóa report liên quan
    await Report.deleteMany({ targetId: review._id });
    await User.findByIdAndUpdate(reviewerId, { $inc: { totalReviews: -1 } });
    await review.deleteOne();

    // Tính lại điểm track sau khi xóa review
    const scoreData = await Review.calcTrackScore(trackId);
    await Track.findByIdAndUpdate(trackId, {
      reviewCount:    scoreData.reviewCount,
      scoreBreakdown: scoreData.scoreBreakdown,
      averageScore:   scoreData.averageScore,
    });

    res.status(200).json({ success: true, message: 'Đã xóa đánh giá thành công' });

  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    console.error('[deleteReviewAdmin]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 8: LẤY DANH SÁCH BÁO CÁO
// ════════════════════════════════════════════════════════════
/**
 * @route   GET /api/admin/reports
 * @access  Private — Admin
 * Query: targetType (track|review|user), status (pending|resolved|dismissed), page, limit
 */
const getReports = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const { targetType, status } = req.query;
    const filter = {};

    if (targetType && ['track', 'review', 'user'].includes(targetType)) filter.targetType = targetType;
    if (status && ['pending', 'resolved', 'dismissed'].includes(status)) filter.status = status;
    else filter.status = 'pending'; // mặc định chỉ lấy chờ xử lý

    const skip  = (page - 1) * limit;
    const total = await Report.countDocuments(filter);

    const reports = await Report.find(filter)
      .populate('reportedBy', 'name avatarUrl email')
      .populate('resolvedBy', 'name')
      .populate({ path: 'targetId', select: 'title name comment email avatarUrl' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      reports,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });

  } catch (error) {
    console.error('[getReports]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 9: XỬ LÝ BÁO CÁO
// ════════════════════════════════════════════════════════════
/**
 * @route   PATCH /api/admin/reports/:id/resolve
 * @access  Private — Admin
 * Body: action ('resolved' | 'dismissed'), adminNote
 */
const resolveReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo' });

    const { action, adminNote } = req.body;
    if (!['resolved', 'dismissed'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action phải là: resolved hoặc dismissed' });
    }

    report.status     = action;
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
    report.adminNote  = adminNote?.trim() || '';
    await report.save();

    res.status(200).json({
      success: true,
      message: action === 'resolved' ? 'Đã xử lý báo cáo' : 'Đã bỏ qua báo cáo',
      report,
    });

  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    console.error('[resolveReport]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 10: DANH SÁCH TẤT CẢ TRACK (Admin)
// ════════════════════════════════════════════════════════════
/**
 * @route   GET /api/admin/tracks
 * @access  Private — Admin
 */
const getAllTracks = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search && search.trim()) filter.$text = { $search: search.trim() };

    const skip  = (page - 1) * limit;
    const total = await Track.countDocuments(filter);
    const tracks = await Track.find(filter)
      .populate('artist', 'name email avatarUrl')
      .sort({ reportCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ success: true, tracks, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });

  } catch (error) {
    console.error('[getAllTracks]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 11: DANH SÁCH TẤT CẢ REVIEW (Admin)
// ════════════════════════════════════════════════════════════
/**
 * @route   GET /api/admin/reviews
 * @access  Private — Admin
 */
const getAllReviews = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip   = (page - 1) * limit;

    const total   = await Review.countDocuments();
    const reviews = await Review.find()
      .populate('track',    'title coverUrl genre')
      .populate('reviewer', 'name avatarUrl email')
      .sort({ reportCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ success: true, reviews, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });

  } catch (error) {
    console.error('[getAllReviews]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = {
  getDashboardStats,
  getUsers,
  toggleUserStatus,
  updateUser,
  deleteUser,
  deleteTrackAdmin,
  deleteReviewAdmin,
  getReports,
  resolveReport,
  getAllTracks,
  getAllReviews,
};
