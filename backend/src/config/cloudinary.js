const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

/**
 * Cấu hình Cloudinary
 * Lấy thông tin từ .env:
 *   CLOUDINARY_CLOUD_NAME=dqklaxttz
 *   CLOUDINARY_API_KEY=447399128281596
 *   CLOUDINARY_API_SECRET=bTt0OCIRu2pGD1pVckcNLlw9JMM
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─────────────────────────────────────────────
// Storage cho FILE NHẠC (audio)
// Lưu vào folder: music_platform/tracks
// Cloudinary dùng resource_type 'video' cho cả audio
// ─────────────────────────────────────────────
const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:        'music_platform/tracks',
    resource_type: 'video',                          // bắt buộc cho file audio
    public_id:     `track_${Date.now()}`,            // tên file trên Cloudinary
    format:        undefined,                        // giữ nguyên format gốc
    allowed_formats: ['mp3', 'wav', 'flac', 'aac'],
  }),
});

// ─────────────────────────────────────────────
// Storage cho ẢNH BÌA (cover art)
// Lưu vào folder: music_platform/covers
// ─────────────────────────────────────────────
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:          'music_platform/covers',
    resource_type:   'image',
    public_id:       `cover_${Date.now()}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation:  [{ width: 800, height: 800, crop: 'limit' }], // resize bìa về tối đa 800x800
  }),
});

// ─────────────────────────────────────────────
// Kiểm tra đuôi file trước khi upload (filter phía server)
// ─────────────────────────────────────────────
const audioFilter = (req, file, cb) => {
  const allowed = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/mp3'];
  if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file âm thanh (MP3, WAV, FLAC, AAC)'), false);
  }
};

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)'), false);
  }
};

// ─────────────────────────────────────────────
// Multer upload instances (dùng trong routes)
// ─────────────────────────────────────────────

// Upload 1 file nhạc (field name: 'audio')
const uploadAudio = multer({
  storage:  audioStorage,
  fileFilter: audioFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // tối đa 50MB
});

// Upload 1 ảnh bìa (field name: 'cover')
const uploadImage = multer({
  storage:  imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // tối đa 5MB
});

// Upload cả 2 cùng lúc — dùng trong POST /api/tracks
// req.files.audio[0]  → file nhạc
// req.files.cover[0]  → ảnh bìa (tuỳ chọn)
const uploadTrackFiles = multer({
  storage: multer.memoryStorage(), // dùng memory rồi xử lý thủ công bên dưới nếu cần
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

// Upload audio + cover bằng 2 storage riêng biệt
// (Cách đơn giản hơn: gọi 2 lần upload trong controller)
const uploadAudioSingle = multer({ storage: audioStorage, fileFilter: audioFilter, limits: { fileSize: 50 * 1024 * 1024 } }).single('audio');
const uploadImageSingle = multer({ storage: imageStorage, fileFilter: imageFilter, limits: { fileSize: 5  * 1024 * 1024 } }).single('cover');

module.exports = {
  cloudinary,       // dùng để xoá file: cloudinary.uploader.destroy(publicId)
  audioStorage,     // dùng trực tiếp nếu cần tạo multer instance riêng
  imageStorage,
  uploadAudio,      // multer middleware upload nhạc
  uploadImage,      // multer middleware upload ảnh
  uploadAudioSingle,
  uploadImageSingle,
};
