const mongoose = require('mongoose');

/**
 * MODEL: Track (Bài nhạc)
 * Được upload bởi User (bất kỳ user thường nào)
 * status: published | removed
 */
const trackSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tên bài nhạc không được để trống'],
      trim: true,
    },
    // Người upload (bất kỳ user nào)
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
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
    audioPublicId: String,
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

    // ── Trạng thái ──────────────────────────────────────────
    // published: hiển thị công khai ngay sau khi upload
    // removed: đã bị admin xóa / ẩn do vi phạm
    status: {
      type: String,
      enum: ['published', 'removed'],
      default: 'published',
    },

    // ── Điểm đánh giá ───────────────────────────────────────
    averageScore: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    scoreBreakdown: {
      melody:    { type: Number, default: 0 },
      lyrics:    { type: Number, default: 0 },
      harmony:   { type: Number, default: 0 },
      rhythm:    { type: Number, default: 0 },
      production:{ type: Number, default: 0 },
    },
    tags: [String],

    // ── Báo cáo vi phạm ─────────────────────────────────────
    reportCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reports: [{
      reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason:     { type: String },
      createdAt:  { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

// Index để tìm kiếm nhanh
trackSchema.index({ title: 'text', tags: 'text' });
trackSchema.index({ artist: 1, status: 1 });
trackSchema.index({ reportCount: -1 }); // Admin xem track bị báo cáo nhiều nhất

module.exports = mongoose.model('Track', trackSchema);
