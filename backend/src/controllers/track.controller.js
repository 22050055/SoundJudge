const Track  = require('../models/Track');
const Review = require('../models/Review');
const { cloudinary } = require('../config/cloudinary');

// ════════════════════════════════════════════════════════════
//  CONTROLLER 1: UPLOAD BÀI NHẠC
// ════════════════════════════════════════════════════════════

/**
 * @desc    Artist upload bài nhạc mới lên nền tảng
 * @route   POST /api/tracks
 * @access  Private — chỉ Artist
 *
 * Body (multipart/form-data):
 *   audio        {file}    - File nhạc bắt buộc (MP3/WAV/FLAC/AAC, tối đa 50MB)
 *   cover        {file}    - Ảnh bìa tuỳ chọn (JPG/PNG/WEBP, tối đa 5MB)
 *   title        {string}  - Tên bài nhạc
 *   genre        {string}  - Thể loại: pop|rock|jazz|classical|hiphop|electronic|folk|other
 *   description  {string}  - Mô tả ngắn
 *   tags         {string}  - JSON array string, vd: '["ballad","acoustic"]'
 */
const uploadTrack = async (req, res) => {
  try {
    // req.files được xử lý bởi multer middleware uploadTrackFields ở routes
    const audioFile = req.files?.audio?.[0];
    const coverFile = req.files?.cover?.[0];

    // ── 1. Bắt buộc phải có file nhạc ─────────────────────
    if (!audioFile) {
      return res.status(400).json({
        success: false,
        message: 'File nhạc là bắt buộc. Vui lòng gửi file với field name là "audio".',
      });
    }

    const { title, genre, description, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên bài nhạc không được để trống',
      });
    }

    // ── 2. Parse tags từ JSON string ──────────────────────
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
        if (!Array.isArray(parsedTags)) parsedTags = [];
        parsedTags = parsedTags
          .map((t) => String(t).trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 10); // giới hạn tối đa 10 tags
      } catch {
        parsedTags = [];
      }
    }

    // ── 3. Tạo track document ──────────────────────────────
    // audioFile.path     = URL công khai trên Cloudinary
    // audioFile.filename = public_id để xoá về sau
    const trackData = {
      title:         title.trim(),
      genre:         genre || 'other',
      description:   description?.trim() || '',
      tags:          parsedTags,
      artist:        req.user._id,
      audioUrl:      audioFile.path,
      audioPublicId: audioFile.filename,
    };

    if (coverFile) {
      trackData.coverUrl      = coverFile.path;
      trackData.coverPublicId = coverFile.filename;
    }

    const track = await Track.create(trackData);
    await track.populate('artist', 'name avatarUrl');

    res.status(201).json({
      success: true,
      message: 'Upload bài nhạc thành công, đang chờ reviewer đánh giá',
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
 * @desc    Lấy danh sách bài nhạc có lọc, tìm kiếm và phân trang
 * @route   GET /api/tracks
 * @access  Private — tất cả role
 *
 * Query params:
 *   page    {number}  - Trang hiện tại (mặc định: 1)
 *   limit   {number}  - Số bài mỗi trang (mặc định: 10, tối đa: 50)
 *   status  {string}  - pending | reviewing | completed
 *   genre   {string}  - Lọc theo thể loại
 *   search  {string}  - Tìm full-text theo title và tags
 *
 * Phân quyền:
 *   artist   → chỉ thấy bài của chính mình
 *   reviewer → chỉ thấy bài pending + reviewing
 *   admin    → thấy tất cả
 */
const getTracks = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const { status, genre, search } = req.query;
    const filter = {};

    // ── Phân quyền theo role ──────────────────────────────
    if (req.user.role === 'artist') {
      filter.artist = req.user._id;

    } else if (req.user.role === 'reviewer') {
      // Reviewer mặc định chỉ thấy bài chờ review
      filter.status = (status && ['pending', 'reviewing'].includes(status))
        ? status
        : { $in: ['pending', 'reviewing'] };
    }

    // ── Filter từ query params (áp dụng cho artist và admin) ─
    if (req.user.role !== 'reviewer') {
      if (status) filter.status = status;
    }
    if (genre) filter.genre = genre;
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    // ── Truy vấn DB ───────────────────────────────────────
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
 * @desc    Lấy chi tiết một bài nhạc theo ID
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

    // Artist chỉ được xem bài của mình
    if (
      req.user.role === 'artist' &&
      track.artist._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem bài nhạc này',
      });
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
 * @desc    Xoá bài nhạc + file Cloudinary + toàn bộ review liên quan
 * @route   DELETE /api/tracks/:id
 * @access  Private — Artist (chỉ bài của mình) hoặc Admin
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
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xoá bài nhạc này',
      });
    }

    // ── Xoá file audio trên Cloudinary ───────────────────
    if (track.audioPublicId) {
      try {
        await cloudinary.uploader.destroy(track.audioPublicId, { resource_type: 'video' });
      } catch (cdnErr) {
        console.warn('[deleteTrack] Xoá audio Cloudinary thất bại:', cdnErr.message);
      }
    }

    // ── Xoá ảnh bìa trên Cloudinary ──────────────────────
    if (track.coverPublicId) {
      try {
        await cloudinary.uploader.destroy(track.coverPublicId, { resource_type: 'image' });
      } catch (cdnErr) {
        console.warn('[deleteTrack] Xoá cover Cloudinary thất bại:', cdnErr.message);
      }
    }

    // ── Xoá tất cả review của bài này ────────────────────
    await Review.deleteMany({ track: track._id });

    await track.deleteOne();

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
 * @desc    Báo cáo đầy đủ: điểm tổng hợp + danh sách review được duyệt
 * @route   GET /api/tracks/:id/stats
 * @access  Private — Artist (chỉ bài của mình) hoặc Admin
 */
const getTrackStats = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id)
      .populate('artist', 'name avatarUrl');

    if (!track) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài nhạc' });
    }

    const isOwner = track.artist._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem thống kê bài nhạc này',
      });
    }

    const reviews = await Review.find({ track: req.params.id, status: 'approved' })
      .populate('reviewer', 'name avatarUrl reputationScore totalReviews')
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
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = { uploadTrack, getTracks, getTrackById, deleteTrack, getTrackStats };
