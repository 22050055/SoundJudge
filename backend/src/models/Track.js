const mongoose = require('mongoose');

/**
 * MODEL: Track (Bài nhạc)
 * Được upload bởi Artist
 * status: pending | reviewing | completed
 */
const trackSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tên bài nhạc không được để trống'],
      trim: true,
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    genre: {
      type: String,
      enum: ['pop', 'rock', 'jazz', 'classical', 'hiphop', 'electronic', 'folk', 'other'],
      default: 'other',
    },
    description: {
      type: String,
      default: '',
    },
    // URL file nhạc trên Cloudinary
    audioUrl: {
      type: String,
      required: true,
    },
    audioPublicId: String, // Để xóa file trên Cloudinary
    // URL ảnh bìa
    coverUrl: {
      type: String,
      default: '',
    },
    coverPublicId: String,
    duration: {
      type: Number, // tính bằng giây
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'completed'],
      default: 'pending',
    },
    // Điểm tổng hợp sau khi có đủ reviews
    averageScore: {
      type: Number,
      default: 0,
    },
    // Số lượt review
    reviewCount: {
      type: Number,
      default: 0,
    },
    // Tiêu chí đánh giá theo yêu cầu đề tài
    scoreBreakdown: {
      melody:    { type: Number, default: 0 }, // Giai điệu
      lyrics:    { type: Number, default: 0 }, // Lời
      harmony:   { type: Number, default: 0 }, // Hòa âm
      rhythm:    { type: Number, default: 0 }, // Nhịp điệu
      production:{ type: Number, default: 0 }, // Sản xuất
    },
    tags: [String],
  },
  { timestamps: true }
);

// Index để tìm kiếm nhanh
trackSchema.index({ title: 'text', tags: 'text' });
trackSchema.index({ artist: 1, status: 1 });

module.exports = mongoose.model('Track', trackSchema);
