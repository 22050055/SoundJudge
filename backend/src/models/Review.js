const mongoose = require('mongoose');

// ════════════════════════════════════════════════════════════
//  SUB-SCHEMA: Ghi chu theo moc thoi gian trong bai nhac
// ════════════════════════════════════════════════════════════

/**
 * timeMarkerSchema — Reviewer co the ghi chu tai mot thoi diem cu the
 * Vi du: { atSecond: 42, note: "Giai dieu bat dau rat an tuong o day" }
 *
 * CANH BAO: KHONG dat ten la "timestamps" vi Mongoose da dung ten do
 * cho option { timestamps: true } — se gay xung dot va loi runtime.
 * Ten dung phai dung la: timeMarkers
 */
const timeMarkerSchema = new mongoose.Schema(
  {
    atSecond: {
      type:     Number,
      min:      [0, 'Thoi diem khong the am'],
      required: true,
    },
    note: {
      type:      String,
      trim:      true,
      maxlength: [200, 'Ghi chu khong duoc vuot qua 200 ky tu'],
      required:  true,
    },
  },
  { _id: false }
);


// ════════════════════════════════════════════════════════════
//  SCHEMA CHINH
// ════════════════════════════════════════════════════════════
const reviewSchema = new mongoose.Schema(
  {
    // Bai nhac duoc danh gia
    track: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Track',
      required: [true, 'Bai nhac duoc danh gia la bat buoc'],
    },

    // Reviewer thuc hien danh gia
    reviewer: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Thong tin reviewer la bat buoc'],
    },

    // ── 5 Tieu chi dinh luong (thang diem 1 – 10) ──────────
    scores: {
      /** Giai dieu: su thu hut, de nho cua melody chinh */
      melody: {
        type:     Number,
        required: [true, 'Diem Giai dieu la bat buoc'],
        min:      [1, 'Diem toi thieu la 1'],
        max:      [10, 'Diem toi da la 10'],
      },
      /** Loi nhac: chat luong ca tu, y nghia, cach dung ngon ngu */
      lyrics: {
        type:     Number,
        required: [true, 'Diem Loi la bat buoc'],
        min:      [1, 'Diem toi thieu la 1'],
        max:      [10, 'Diem toi da la 10'],
      },
      /** Hoa am: do phong phu, su hai hoa cua cac hop am */
      harmony: {
        type:     Number,
        required: [true, 'Diem Hoa am la bat buoc'],
        min:      [1, 'Diem toi thieu la 1'],
        max:      [10, 'Diem toi da la 10'],
      },
      /** Nhip dieu: tinh nhat quan, groove va cam giac nhip */
      rhythm: {
        type:     Number,
        required: [true, 'Diem Nhip dieu la bat buoc'],
        min:      [1, 'Diem toi thieu la 1'],
        max:      [10, 'Diem toi da la 10'],
      },
      /** San xuat: chat luong am thanh tong the (mix, master, arrangement) */
      production: {
        type:     Number,
        required: [true, 'Diem San xuat la bat buoc'],
        min:      [1, 'Diem toi thieu la 1'],
        max:      [10, 'Diem toi da la 10'],
      },
    },

    /**
     * overallScore — Diem trung binh cua 5 tieu chi
     * KHONG do nguoi dung nhap, duoc tu dong tinh trong pre('save') hook
     * Luu kieu Number, lam tron 1 chu so thap phan
     */
    overallScore: {
      type:    Number,
      default: 0,
      min:     0,
      max:     10,
    },

    // Nhan xet van ban
    comment: {
      type:      String,
      required:  [true, 'Nhan xet khong duoc de trong'],
      minlength: [20,   'Nhan xet phai co it nhat 20 ky tu'],
      maxlength: [2000, 'Nhan xet khong duoc vuot qua 2000 ky tu'],
      trim:      true,
    },

    /**
     * timeMarkers — Ghi chu tai moc thoi gian trong bai nhac
     * Reviewer co the danh dau cac diem dang chu y khi nghe
     * Vi du: [{ atSecond: 30, note: "Dieu khuc rat catchy" }]
     */
    timeMarkers: {
      type:    [timeMarkerSchema],
      default: [],
    },

    /**
     * status — Admin kiem duyet truoc khi hien cho Artist
     *   pending  -> Moi gui, cho Admin xem
     *   approved -> Da duyet, tinh vao diem tong hop cua Track
     *   rejected -> Bi tu choi (vi pham tieu chuan, spam...)
     */
    status: {
      type:    String,
      enum:    {
        values:  ['pending', 'approved', 'rejected'],
        message: 'Status phai la: pending, approved hoac rejected',
      },
      default: 'pending',
    },

    // Ly do tu choi — Admin dien khi status = rejected
    rejectionReason: {
      type:    String,
      default: '',
      trim:    true,
    },
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

/**
 * Rang buoc UNIQUE: moi reviewer chi duoc review mot track DUY NHAT mot lan
 * Neu vi pham -> MongoDB tra loi code 11000 (duplicate key)
 */
reviewSchema.index({ track: 1, reviewer: 1 }, { unique: true });

// Tim nhanh review theo track + status
reviewSchema.index({ track: 1, status: 1 });

// Tim nhanh tat ca review cua mot reviewer
reviewSchema.index({ reviewer: 1, createdAt: -1 });


// ════════════════════════════════════════════════════════════
//  VIRTUAL FIELDS
// ════════════════════════════════════════════════════════════

/**
 * scoreLabel — Nhan xep loai dua tren overallScore
 */
reviewSchema.virtual('scoreLabel').get(function () {
  const s = this.overallScore;
  if (s >= 9)   return 'Xuat sac';
  if (s >= 7.5) return 'Tot';
  if (s >= 6)   return 'Kha';
  if (s >= 4)   return 'Trung binh';
  return 'Can cai thien';
});


// ════════════════════════════════════════════════════════════
//  MIDDLEWARE (HOOKS)
// ════════════════════════════════════════════════════════════

/**
 * Pre-save: Tu dong tinh overallScore tu 5 tieu chi
 * Cong thuc: overallScore = (melody + lyrics + harmony + rhythm + production) / 5
 */
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
 * Tinh lai diem tong hop cho mot Track dua tren tat ca review APPROVED
 * Goi trong review.controller.js sau khi approve hoac reject
 *
 * @param   {string} trackId  - _id cua Track can tinh lai diem
 * @returns {object} { reviewCount, scoreBreakdown, averageScore }
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
