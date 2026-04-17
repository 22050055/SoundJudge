const mongoose = require('mongoose');

// ════════════════════════════════════════════════════════════
//  SUB-SCHEMA: Ghi chú theo mốc thời gian
// ════════════════════════════════════════════════════════════
const timeMarkerSchema = new mongoose.Schema(
  {
    atSecond: {
      type:     Number,
      min:      [0, 'Thời điểm không thể âm'],
      required: true,
    },
    note: {
      type:      String,
      trim:      true,
      maxlength: [200, 'Ghi chú không được vượt quá 200 ký tự'],
      required:  true,
    },
  },
  { _id: false }
);


// ════════════════════════════════════════════════════════════
//  SCHEMA CHÍNH
// ════════════════════════════════════════════════════════════
const reviewSchema = new mongoose.Schema(
  {
    // Bài nhạc được đánh giá
    track: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Track',
      required: [true, 'Bài nhạc được đánh giá là bắt buộc'],
    },

    // Người thực hiện đánh giá
    reviewer: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Thông tin reviewer là bắt buộc'],
    },

    // ── 5 Tiêu chí định lượng (thang điểm 1 – 10) ──────────
    scores: {
      melody: {
        type:     Number,
        required: [true, 'Điểm Giai điệu là bắt buộc'],
        min:      [1, 'Điểm tối thiểu là 1'],
        max:      [10, 'Điểm tối đa là 10'],
      },
      lyrics: {
        type:     Number,
        required: [true, 'Điểm Lời là bắt buộc'],
        min:      [1, 'Điểm tối thiểu là 1'],
        max:      [10, 'Điểm tối đa là 10'],
      },
      harmony: {
        type:     Number,
        required: [true, 'Điểm Hòa âm là bắt buộc'],
        min:      [1, 'Điểm tối thiểu là 1'],
        max:      [10, 'Điểm tối đa là 10'],
      },
      rhythm: {
        type:     Number,
        required: [true, 'Điểm Nhịp điệu là bắt buộc'],
        min:      [1, 'Điểm tối thiểu là 1'],
        max:      [10, 'Điểm tối đa là 10'],
      },
      production: {
        type:     Number,
        required: [true, 'Điểm Sản xuất là bắt buộc'],
        min:      [1, 'Điểm tối thiểu là 1'],
        max:      [10, 'Điểm tối đa là 10'],
      },
    },

    // Điểm trung bình tự động tính từ pre('save')
    overallScore: {
      type:    Number,
      default: 0,
      min:     0,
      max:     10,
    },

    // Nhận xét văn bản
    comment: {
      type:      String,
      required:  [true, 'Nhận xét không được để trống'],
      minlength: [20,   'Nhận xét phải có ít nhất 20 ký tự'],
      maxlength: [2000, 'Nhận xét không được vượt quá 2000 ký tự'],
      trim:      true,
    },

    timeMarkers: {
      type:    [timeMarkerSchema],
      default: [],
    },

    // ── Trạng thái ──────────────────────────────────────────
    // Review tự động được approved ngay khi gửi (không cần Admin duyệt)
    status: {
      type:    String,
      enum:    {
        values:  ['approved', 'removed'],
        message: 'Status phải là: approved hoặc removed',
      },
      default: 'approved',
    },

    // ── Báo cáo vi phạm ─────────────────────────────────────
    reportCount: {
      type:    Number,
      default: 0,
      min:     0,
    },
    reports: [{
      reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason:     { type: String },
      createdAt:  { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);


// ════════════════════════════════════════════════════════════
//  INDEX
// ════════════════════════════════════════════════════════════

// Mỗi user chỉ được review một track duy nhất một lần
reviewSchema.index({ track: 1, reviewer: 1 }, { unique: true });

// Tìm nhanh review theo track + status
reviewSchema.index({ track: 1, status: 1 });

// Tìm nhanh tất cả review của một user
reviewSchema.index({ reviewer: 1, createdAt: -1 });

// Admin xem review bị báo cáo nhiều nhất
reviewSchema.index({ reportCount: -1 });


// ════════════════════════════════════════════════════════════
//  VIRTUAL FIELDS
// ════════════════════════════════════════════════════════════
reviewSchema.virtual('scoreLabel').get(function () {
  const s = this.overallScore;
  if (s >= 9)   return 'Xuất sắc';
  if (s >= 7.5) return 'Tốt';
  if (s >= 6)   return 'Khá';
  if (s >= 4)   return 'Trung bình';
  return 'Cần cải thiện';
});


// ════════════════════════════════════════════════════════════
//  MIDDLEWARE (HOOKS)
// ════════════════════════════════════════════════════════════

// Tự động tính overallScore từ 5 tiêu chí
reviewSchema.pre('save', function (next) {
  if (this.isModified('scores')) {
    const { melody, lyrics, harmony, rhythm, production } = this.scores;
    const total = melody + lyrics + harmony + rhythm + production;
    this.overallScore = parseFloat((total / 5).toFixed(1));
  }
  next();
});


// ════════════════════════════════════════════════════════════
//  STATIC METHODS
// ════════════════════════════════════════════════════════════

/**
 * Review.calcTrackScore(trackId)
 * Tính lại điểm tổng hợp cho một Track dựa trên tất cả review APPROVED
 */
reviewSchema.statics.calcTrackScore = async function (trackId) {
  const result = await this.aggregate([
    {
      $match: {
        track:  new mongoose.Types.ObjectId(trackId),
        status: 'approved',
      },
    },
    {
      $group: {
        _id:           '$track',
        reviewCount:   { $sum: 1 },
        avgMelody:     { $avg: '$scores.melody' },
        avgLyrics:     { $avg: '$scores.lyrics' },
        avgHarmony:    { $avg: '$scores.harmony' },
        avgRhythm:     { $avg: '$scores.rhythm' },
        avgProduction: { $avg: '$scores.production' },
        avgOverall:    { $avg: '$overallScore' },
      },
    },
  ]);

  if (result.length === 0) {
    return {
      reviewCount: 0,
      scoreBreakdown: { melody: 0, lyrics: 0, harmony: 0, rhythm: 0, production: 0 },
      averageScore: 0,
    };
  }

  const r = result[0];
  return {
    reviewCount: r.reviewCount,
    scoreBreakdown: {
      melody:     parseFloat(r.avgMelody.toFixed(1)),
      lyrics:     parseFloat(r.avgLyrics.toFixed(1)),
      harmony:    parseFloat(r.avgHarmony.toFixed(1)),
      rhythm:     parseFloat(r.avgRhythm.toFixed(1)),
      production: parseFloat(r.avgProduction.toFixed(1)),
    },
    averageScore: parseFloat(r.avgOverall.toFixed(2)),
  };
};


// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = mongoose.model('Review', reviewSchema);
