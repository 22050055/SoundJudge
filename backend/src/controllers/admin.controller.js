const User   = require('../models/User');
const Track  = require('../models/Track');
const Review = require('../models/Review');

// ════════════════════════════════════════════════════════════
//  CONTROLLER 1: THỐNG KÊ TỔNG QUAN (Dashboard)
// ════════════════════════════════════════════════════════════

/**
 * @desc    Lấy số liệu tổng quan để hiển thị trên Admin Dashboard
 * @route   GET /api/admin/stats
 * @access  Private — chỉ Admin
 *
 * Trả về:
 *   stats        - Các con số tổng hợp nhanh
 *   usersByRole  - Phân bổ người dùng theo role
 *   tracksByStatus - Phân bổ bài nhạc theo trạng thái
 */
const getDashboardStats = async (req, res) => {
  try {
    // Chạy song song bằng Promise.all để tối ưu thời gian
    const [
      totalUsers,
      totalTracks,
      totalApprovedReviews,
      pendingReviews,
      usersByRoleRaw,
      tracksByStatusRaw,
    ] = await Promise.all([
      User.countDocuments(),
      Track.countDocuments(),
      Review.countDocuments({ status: 'approved' }),
      Review.countDocuments({ status: 'pending' }),

      // Aggregation: đếm user theo từng role
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Aggregation: đếm track theo từng status
      Track.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Chuyển kết quả aggregate sang object dễ đọc hơn
    const usersByRole = usersByRoleRaw.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, { artist: 0, reviewer: 0, admin: 0 });

    const tracksByStatus = tracksByStatusRaw.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, { pending: 0, reviewing: 0, completed: 0 });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalTracks,
        totalApprovedReviews,
        pendingReviews,
      },
      usersByRole,
      tracksByStatus,
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
 * @desc    Lấy danh sách tất cả người dùng có lọc và phân trang
 * @route   GET /api/admin/users
 * @access  Private — chỉ Admin
 *
 * Query params:
 *   page     {number}  - Trang hiện tại (mặc định: 1)
 *   limit    {number}  - Số item mỗi trang (mặc định: 20)
 *   role     {string}  - Lọc theo role: artist|reviewer|admin
 *   isActive {string}  - Lọc theo trạng thái: 'true' | 'false'
 *   search   {string}  - Tìm theo tên hoặc email
 */
const getUsers = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const { role, isActive, search } = req.query;

    const filter = {};

    if (role && ['artist', 'reviewer', 'admin'].includes(role)) {
      filter.role = role;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Tìm kiếm theo tên hoặc email bằng regex (không phân biệt hoa thường)
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

    // Gọi toPublicJSON cho từng user
    // Do dùng .lean() nên không có method → tự map thủ công
    const safeUsers = users.map((u) => ({
      id:             u._id,
      name:           u.name,
      email:          u.email,
      role:           u.role,
      avatarUrl:      u.avatar?.url || '',
      bio:            u.bio,
      reputationScore: u.reputationScore,
      totalReviews:   u.totalReviews,
      isActive:       u.isActive,
      createdAt:      u.createdAt,
    }));

    res.status(200).json({
      success: true,
      users: safeUsers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
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
 * @desc    Toggle trạng thái isActive của một tài khoản (khoá ↔ mở khoá)
 * @route   PATCH /api/admin/users/:id/toggle
 * @access  Private — chỉ Admin
 */
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Không cho khoá chính tài khoản admin đang thao tác
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể khoá tài khoản của chính mình',
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: user.isActive
        ? `Tài khoản "${user.name}" đã được mở khoá`
        : `Tài khoản "${user.name}" đã bị khoá`,
      user: user.toPublicJSON(),
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
    }
    console.error('[toggleUserStatus]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 4: ADMIN XOÁ BÀI NHẠC VI PHẠM
// ════════════════════════════════════════════════════════════

/**
 * @desc    Admin xoá bất kỳ bài nhạc nào (bao gồm cả file Cloudinary + reviews)
 * @route   DELETE /api/admin/tracks/:id
 * @access  Private — chỉ Admin
 *
 * Lưu ý: Controller này tương tự deleteTrack trong track.controller.js
 * nhưng dành riêng cho Admin, không cần kiểm tra quyền sở hữu.
 */
const deleteTrackAdmin = async (req, res) => {
  try {
    const { cloudinary } = require('../config/cloudinary');
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài nhạc' });
    }

    // Xoá file audio trên Cloudinary
    if (track.audioPublicId) {
      try {
        await cloudinary.uploader.destroy(track.audioPublicId, { resource_type: 'video' });
      } catch (cdnErr) {
        console.warn('[deleteTrackAdmin] Xoá audio Cloudinary thất bại:', cdnErr.message);
      }
    }

    // Xoá ảnh bìa trên Cloudinary
    if (track.coverPublicId) {
      try {
        await cloudinary.uploader.destroy(track.coverPublicId, { resource_type: 'image' });
      } catch (cdnErr) {
        console.warn('[deleteTrackAdmin] Xoá cover Cloudinary thất bại:', cdnErr.message);
      }
    }

    // Xoá tất cả review liên quan
    await Review.deleteMany({ track: track._id });

    await track.deleteOne();

    res.status(200).json({
      success: true,
      message: `Đã xoá bài nhạc "${track.title}" thành công`,
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID bài nhạc không hợp lệ' });
    }
    console.error('[deleteTrackAdmin]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xoá bài nhạc' });
  }
};


// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = {
  getDashboardStats,
  getUsers,
  toggleUserStatus,
  deleteTrackAdmin,
};
