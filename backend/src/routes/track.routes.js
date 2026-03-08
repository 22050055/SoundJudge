const router = require('express').Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');
const { protect, authorize } = require('../middleware/auth');
const {
  uploadTrack,
  getTracks,
  getTrackById,
  deleteTrack,
  getTrackStats,
} = require('../controllers/track.controller');


// ════════════════════════════════════════════════════════════
//  MULTER — UPLOAD FILE NHẠC + ẢNH BÌA CÙNG LÚC
// ════════════════════════════════════════════════════════════

/**
 * dynamicStorage
 * CloudinaryStorage linh hoạt: kiểm tra tên field để chọn
 * folder + resource_type phù hợp cho từng file.
 *
 * Tại sao không dùng uploadAudio.fields() từ cloudinary.js?
 * → multer chỉ cho phép 1 storage duy nhất trên mỗi instance.
 *   audioStorage dùng resource_type='video', imageStorage dùng 'image'.
 *   Muốn xử lý cả 2 field trong 1 request → cần storage động.
 */
const dynamicStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    if (file.fieldname === 'audio') {
      return {
        folder:          'music_platform/tracks',
        resource_type:   'video',            // Cloudinary yêu cầu 'video' cho audio
        public_id:       `track_${Date.now()}`,
        allowed_formats: ['mp3', 'wav', 'flac', 'aac'],
      };
    }
    // field 'cover' → ảnh bìa
    return {
      folder:          'music_platform/covers',
      resource_type:   'image',
      public_id:       `cover_${Date.now()}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation:  [{ width: 800, height: 800, crop: 'limit' }],
    };
  },
});

/** Kiểm tra MIME type trước khi upload */
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

/**
 * uploadTrackFields
 * Middleware xử lý upload 2 file cùng lúc:
 *   audio (bắt buộc, tối đa 50MB) + cover (tuỳ chọn, tối đa 5MB)
 *
 * Sau khi middleware này chạy:
 *   req.files.audio[0] → thông tin file nhạc đã upload lên Cloudinary
 *   req.files.cover[0] → thông tin ảnh bìa (nếu có)
 */
const uploadTrackFields = multer({
  storage:    dynamicStorage,
  fileFilter: dynamicFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB (áp dụng cho cả 2 field)
    files:    2,                // tối đa 2 file trong 1 request
  },
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

/**
 * handleUploadError
 * Middleware bắt lỗi từ multer (sai loại file, vượt kích thước...)
 * và trả về JSON thay vì để Express mặc định xử lý.
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File quá lớn. Giới hạn: audio 50MB, ảnh bìa 5MB',
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};


// ════════════════════════════════════════════════════════════
//  SWAGGER TAGS
// ════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Tracks
 *   description: Quản lý bài nhạc
 */


// ════════════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/tracks:
 *   post:
 *     summary: Artist upload bài nhạc mới (multipart/form-data)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [audio, title]
 *             properties:
 *               audio:       { type: string, format: binary }
 *               cover:       { type: string, format: binary }
 *               title:       { type: string }
 *               genre:       { type: string }
 *               description: { type: string }
 *               tags:        { type: string, example: '["ballad","acoustic"]' }
 *     responses:
 *       201: { description: Upload thành công }
 *       400: { description: Thiếu file hoặc dữ liệu không hợp lệ }
 *       403: { description: Không phải Artist }
 *
 *   get:
 *     summary: Lấy danh sách bài nhạc (có lọc, tìm kiếm, phân trang)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page,   schema: { type: integer } }
 *       - { in: query, name: limit,  schema: { type: integer } }
 *       - { in: query, name: status, schema: { type: string, enum: [pending,reviewing,completed] } }
 *       - { in: query, name: genre,  schema: { type: string } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200: { description: Thành công }
 */
router
  .route('/')
  .post(
    protect,
    authorize('artist'),    // Chỉ Artist mới được upload
    uploadTrackFields,      // Multer upload lên Cloudinary
    handleUploadError,      // Bắt lỗi multer
    uploadTrack             // Controller xử lý logic
  )
  .get(
    protect,                // Tất cả role đều xem được (filter trong controller)
    getTracks
  );


/**
 * @swagger
 * /api/tracks/{id}:
 *   get:
 *     summary: Lấy chi tiết một bài nhạc
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Thành công }
 *       404: { description: Không tìm thấy }
 *
 *   delete:
 *     summary: Xoá bài nhạc (Artist xoá bài của mình, Admin xoá bất kỳ)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Xoá thành công }
 *       403: { description: Không có quyền }
 *       404: { description: Không tìm thấy }
 */
router
  .route('/:id')
  .get(protect, getTrackById)
  .delete(protect, deleteTrack);


/**
 * @swagger
 * /api/tracks/{id}/stats:
 *   get:
 *     summary: Thống kê chi tiết bài nhạc — điểm tổng hợp + danh sách review
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Thành công }
 *       403: { description: Không có quyền }
 */
router.get(
  '/:id/stats',
  protect,
  authorize('artist', 'admin'),   // Reviewer không cần xem stats
  getTrackStats
);


module.exports = router;
