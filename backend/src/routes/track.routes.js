const router = require('express').Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');
const { protect, authorize, optionalProtect } = require('../middleware/auth');
const {
  uploadTrack,
  getTracks,
  getTrackById,
  deleteTrack,
  getTrackStats,
  reportTrack,
} = require('../controllers/track.controller');


// ════════════════════════════════════════════════════════════
//  MULTER — UPLOAD FILE NHẠC + ẢNH BÌA
// ════════════════════════════════════════════════════════════
const dynamicStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    if (file.fieldname === 'audio') {
      return {
        folder:          'music_platform/tracks',
        resource_type:   'video',
        public_id:       `track_${Date.now()}`,
        allowed_formats: ['mp3', 'wav', 'flac', 'aac'],
      };
    }
    return {
      folder:          'music_platform/covers',
      resource_type:   'image',
      public_id:       `cover_${Date.now()}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation:  [{ width: 800, height: 800, crop: 'limit' }],
    };
  },
});

const dynamicFileFilter = (req, file, cb) => {
  if (file.fieldname === 'audio') {
    if (file.mimetype.startsWith('audio/')) return cb(null, true);
    return cb(new Error('Chỉ chấp nhận file âm thanh (MP3, WAV, FLAC, AAC)'), false);
  }
  if (file.fieldname === 'cover') {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    return cb(new Error('Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)'), false);
  }
  cb(new Error('Field không hợp lệ'), false);
};

const uploadTrackFields = multer({
  storage:    dynamicStorage,
  fileFilter: dynamicFileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 2 },
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File quá lớn. Giới hạn: audio 50MB, ảnh bìa 5MB' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) return res.status(400).json({ success: false, message: err.message });
  next();
};


// ════════════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════════════

// GET /api/tracks       — Tất cả user bao gồm cả khách
// POST /api/tracks      — user + admin upload được
router
  .route('/')
  .post(protect, authorize('user', 'admin'), uploadTrackFields, handleUploadError, uploadTrack)
  .get(optionalProtect, getTracks);

// GET /api/tracks/:id   — Chi tiết bài nhạc
// DELETE /api/tracks/:id — User xóa bài mình, admin xóa bất kỳ
router
  .route('/:id')
  .get(optionalProtect, getTrackById)
  .delete(protect, deleteTrack);

// GET /api/tracks/:id/stats — Ai cũng có thể xem điểm và đánh giá
router.get('/:id/stats', optionalProtect, getTrackStats);

// POST /api/tracks/:id/report — User báo cáo bài vi phạm
router.post('/:id/report', protect, authorize('user'), reportTrack);


module.exports = router;
