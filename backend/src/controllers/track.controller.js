const Track  = require('../models/Track');
const Review = require('../models/Review');
const Report = require('../models/Report');
const User   = require('../models/User');
const Notification = require('../models/Notification');
const { cloudinary } = require('../config/cloudinary');

// ════════════════════════════════════════════════════════════
//  CONTROLLER 1: UPLOAD BÀI NHẠC
// ════════════════════════════════════════════════════════════
/**
 * @desc    User (bất kỳ) upload bài nhạc mới
 * @route   POST /api/tracks
 * @access  Private — user, admin
 */
const uploadTrack = async (req, res) => {
  try {
    const audioFile = req.files?.audio?.[0];
    const coverFile = req.files?.cover?.[0];

    if (!audioFile) {
      return res.status(400).json({
        success: false,
        message: 'File nhạc là bắt buộc. Vui lòng gửi file với field name là "audio".',
      });
    }

    const { title, genre, description, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Tên bài nhạc không được để trống' });
    }

    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
        if (!Array.isArray(parsedTags)) parsedTags = [];
        parsedTags = parsedTags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 10);
      } catch { parsedTags = []; }
    }

    const trackData = {
      title:         title.trim(),
      genre:         genre || 'other',
      description:   description?.trim() || '',
      tags:          parsedTags,
      artist:        req.user._id,
      audioUrl:      audioFile.path,
      audioPublicId: audioFile.filename,
      status:        'published', // Hiển thị công khai ngay
    };

    if (coverFile) {
      trackData.coverUrl      = coverFile.path;
      trackData.coverPublicId = coverFile.filename;
    }

    const track = await Track.create(trackData);
    await track.populate('artist', 'name avatarUrl');

    // Tăng totalTracks của user
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalTracks: 1 } });

    // Thông báo cho những người đang theo dõi (followers)
    try {
      const user = await User.findById(req.user._id).select('followers name');
      if (user && user.followers.length > 0) {
        const notifications = user.followers.map(followerId => ({
          recipient:   followerId,
          sender:      req.user._id,
          type:        'new_track',
          targetId:    track._id,
          targetModel: 'Track',
          message:     `${user.name} vừa đăng bài nhạc mới: ${track.title}`,
          link:        `/dashboard/track/${track._id}`
        }));
        await Notification.insertMany(notifications);
      }
    } catch (notifErr) {
      console.error('Track upload notification error:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Upload bài nhạc thành công',
      track,
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error('[uploadTrack]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi upload' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 2: LẤY DANH SÁCH BÀI NHẠC
// ════════════════════════════════════════════════════════════
/**
 * @desc    Lấy danh sách bài nhạc
 * @route   GET /api/tracks
 * @access  Private — tất cả role
 *
 * user  → chỉ thấy track published
 * admin → thấy tất cả (kể cả removed)
 *
 * Query: page, limit, genre, search, artistId
 */
const getTracks = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const { genre, search, artistId, myTracks } = req.query;
    const filter = {};

    if (!req.user || req.user.role !== 'admin') {
      // Cho phép cả các trạng thái cũ chưa chạy migration để dễ dàng hiển thị bài nhạc hơn.
      filter.status = { $in: ['published', 'pending', 'reviewing', 'completed'] };
    }

    // Lọc track của mình
    if (myTracks === 'true') {
      filter.artist = req.user._id;
    }

    // Lọc theo nghệ sĩ cụ thể
    if (artistId) filter.artist = artistId;

    if (genre) filter.genre = genre;
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    const skip  = (page - 1) * limit;
    const total = await Track.countDocuments(filter);
    const tracks = await Track.find(filter)
      .populate('artist', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      tracks,
      pagination: {
        total,
        page,
        limit,
        pages:   Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('[getTracks]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 3: CHI TIẾT MỘT BÀI NHẠC
// ════════════════════════════════════════════════════════════
/**
 * @route   GET /api/tracks/:id
 * @access  Private — tất cả role
 */
const getTrackById = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id)
      .populate('artist', 'name avatarUrl bio');

    if (!track) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài nhạc' });
    }

    // User thường chỉ thấy track published (admin thấy tất cả)
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin && track.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Bài nhạc không còn tồn tại' });
    }

    res.status(200).json({ success: true, track });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID bài nhạc không hợp lệ' });
    }
    console.error('[getTrackById]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 4: XOÁ BÀI NHẠC
// ════════════════════════════════════════════════════════════
/**
 * @route   DELETE /api/tracks/:id
 * @access  Private — user (chỉ bài của mình) hoặc admin
 */
const deleteTrack = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài nhạc' });
    }

    const isOwner = track.artist.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xoá bài nhạc này' });
    }

    if (track.audioPublicId) {
      try { await cloudinary.uploader.destroy(track.audioPublicId, { resource_type: 'video' }); }
      catch (cdnErr) { console.warn('[deleteTrack] Xoá audio Cloudinary thất bại:', cdnErr.message); }
    }

    if (track.coverPublicId) {
      try { await cloudinary.uploader.destroy(track.coverPublicId, { resource_type: 'image' }); }
      catch (cdnErr) { console.warn('[deleteTrack] Xoá cover Cloudinary thất bại:', cdnErr.message); }
    }

    await Review.deleteMany({ track: track._id });
    await Report.deleteMany({ targetId: track._id, targetType: 'track' });
    await track.deleteOne();

    // Giảm totalTracks của user
    await User.findByIdAndUpdate(track.artist, { $inc: { totalTracks: -1 } });

    res.status(200).json({ success: true, message: 'Đã xoá bài nhạc thành công' });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID bài nhạc không hợp lệ' });
    }
    console.error('[deleteTrack]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xoá' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 5: THỐNG KÊ CHI TIẾT BÀI NHẠC
// ════════════════════════════════════════════════════════════
/**
 * @route   GET /api/tracks/:id/stats
 * @access  Private — chủ bài hoặc admin
 */
const getTrackStats = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id)
      .populate('artist', 'name avatarUrl');

    if (!track) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài nhạc' });
    }

    // [SoundJudge] Mở khoá stats cho tất cả mọi người xem.
    // Chỉ giới hạn một số thông tin nhạy cảm (nếu có) sau này.
    // Hiện tại cho phép xem tổng quan điểm và review.
    
    // const isOwner = track.artist._id.toString() === req.user._id.toString();
    // const isAdmin = req.user.role === 'admin';
    // if (!isOwner && !isAdmin) {
    //   return res.status(403).json({ success: false, message: 'Bạn không có quyền xem thống kê bài nhạc này' });
    // }

    const reviews = await Review.find({ track: req.params.id, status: 'approved' })
      .populate('reviewer', 'name avatarUrl totalReviews')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      track,
      reviews,
      summary: {
        reviewCount:    track.reviewCount,
        averageScore:   track.averageScore,
        scoreBreakdown: track.scoreBreakdown,
        status:         track.status,
      },
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID bài nhạc không hợp lệ' });
    }
    console.error('[getTrackStats]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 6: BÁO CÁO BÀI NHẠC VI PHẠM
// ════════════════════════════════════════════════════════════
/**
 * @route   POST /api/tracks/:id/report
 * @access  Private — user
 */
const reportTrack = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track || track.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài nhạc' });
    }

    // Không cho báo cáo bài của chính mình
    if (track.artist.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Bạn không thể báo cáo bài nhạc của chính mình' });
    }

    const { reason, description } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn lý do báo cáo' });
    }

    // Kiểm tra đã báo cáo chưa
    const existing = await Report.findOne({ reportedBy: req.user._id, targetId: track._id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bạn đã báo cáo bài nhạc này rồi' });
    }

    await Report.create({
      targetType:  'track',
      targetId:    track._id,
      targetModel: 'Track',
      reportedBy:  req.user._id,
      reason,
      description: description?.trim() || '',
    });

    await Track.findByIdAndUpdate(track._id, { $inc: { reportCount: 1 } });

    res.status(201).json({ success: true, message: 'Báo cáo đã được gửi thành công' });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Bạn đã báo cáo bài nhạc này rồi' });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID bài nhạc không hợp lệ' });
    }
    console.error('[reportTrack]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = { uploadTrack, getTracks, getTrackById, deleteTrack, getTrackStats, reportTrack };
