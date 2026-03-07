const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ════════════════════════════════════════════════════════════
//  SCHEMA ĐỊNH NGHĨA
// ════════════════════════════════════════════════════════════
const userSchema = new mongoose.Schema(
  {
    // ── Thông tin cơ bản ────────────────────────────────────
    name: {
      type:     String,
      required: [true, 'Tên không được để trống'],
      trim:     true,
      minlength: [2,  'Tên phải có ít nhất 2 ký tự'],
      maxlength: [50, 'Tên không được vượt quá 50 ký tự'],
    },

    email: {
      type:     String,
      required: [true, 'Email không được để trống'],
      unique:   true,         // tạo index unique tự động
      lowercase: true,        // lưu thành chữ thường
      trim:     true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Email không đúng định dạng',
      ],
    },

    password: {
      type:      String,
      required:  [true, 'Mật khẩu không được để trống'],
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
      select:    false, // KHÔNG bao giờ trả về password trong query thông thường
    },

    // ── Vai trò (phân quyền) ────────────────────────────────
    role: {
      type:    String,
      enum:    {
        values:  ['artist', 'reviewer', 'admin'],
        message: 'Role phải là: artist, reviewer hoặc admin',
      },
      default: 'artist',
    },

    // ── Hồ sơ cá nhân ──────────────────────────────────────
    avatar: {
      url:      { type: String, default: '' },  // URL ảnh trên Cloudinary
      publicId: { type: String, default: '' },  // ID để xoá ảnh cũ khi đổi ảnh mới
    },

    bio: {
      type:      String,
      default:   '',
      maxlength: [300, 'Giới thiệu không được vượt quá 300 ký tự'],
      trim:      true,
    },

    // ── Thống kê theo role ──────────────────────────────────

    /**
     * reputationScore — Điểm uy tín dành cho REVIEWER
     * Tăng +5 mỗi khi một review của họ được Admin duyệt
     * Dùng để hiển thị badge và xếp hạng reviewer
     */
    reputationScore: {
      type:    Number,
      default: 0,
      min:     [0, 'Điểm uy tín không thể âm'],
    },

    /**
     * totalReviews — Tổng số review đã được duyệt (chỉ Reviewer)
     * Cập nhật bởi review.controller khi approveReview()
     */
    totalReviews: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Trạng thái tài khoản ────────────────────────────────
    isActive: {
      type:    Boolean,
      default: true, // Admin có thể đặt false để khoá tài khoản
    },

    /**
     * passwordChangedAt — Lưu thời điểm đổi mật khẩu
     * Dùng để vô hiệu hoá các token cũ sau khi user đổi mật khẩu
     */
    passwordChangedAt: {
      type:   Date,
      select: false,
    },
  },
  {
    timestamps: true, // tự động thêm createdAt và updatedAt
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ════════════════════════════════════════════════════════════
//  INDEX
// ════════════════════════════════════════════════════════════

// Tìm kiếm reviewer theo điểm uy tín (dùng trong leaderboard)
userSchema.index({ role: 1, reputationScore: -1 });


// ════════════════════════════════════════════════════════════
//  VIRTUAL FIELDS
// ════════════════════════════════════════════════════════════

// avatarUrl — trả về URL ảnh hoặc chuỗi rỗng (dễ dùng ở frontend)
userSchema.virtual('avatarUrl').get(function () {
  return this.avatar?.url || '';
});


// ════════════════════════════════════════════════════════════
//  MIDDLEWARE (HOOKS)
// ════════════════════════════════════════════════════════════

/**
 * Pre-save: Hash mật khẩu mỗi khi field password bị thay đổi
 * - Khi đăng ký: password mới → hash
 * - Khi đổi mật khẩu: password mới → hash + ghi lại passwordChangedAt
 * - Khi cập nhật thông tin khác (name, bio...): bỏ qua
 */
userSchema.pre('save', async function (next) {
  // Chỉ hash khi password thực sự bị sửa
  if (!this.isModified('password')) return next();

  // Hash với cost factor 12 (cân bằng giữa bảo mật và tốc độ)
  this.password = await bcrypt.hash(this.password, 12);

  // Ghi lại thời điểm đổi mật khẩu (trừ lần tạo tài khoản đầu tiên)
  if (!this.isNew) {
    // Trừ 1 giây để tránh race condition với JWT iat
    this.passwordChangedAt = Date.now() - 1000;
  }

  next();
});


// ════════════════════════════════════════════════════════════
//  INSTANCE METHODS
// ════════════════════════════════════════════════════════════

/**
 * comparePassword(candidatePassword)
 * So sánh mật khẩu nhập vào với hash đã lưu
 * Dùng trong auth.controller.js khi đăng nhập
 *
 * @param   {string}  candidatePassword  - Mật khẩu người dùng nhập
 * @returns {boolean} true nếu khớp
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * isPasswordChangedAfter(jwtTimestamp)
 * Kiểm tra xem mật khẩu có bị đổi SAU khi token được cấp không
 * Nếu có → token đó coi như không hợp lệ
 *
 * @param   {number}  jwtTimestamp  - Thời gian tạo token (JWT iat), đơn vị giây
 * @returns {boolean} true nếu mật khẩu đổi SAU khi token được tạo
 */
userSchema.methods.isPasswordChangedAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedAt = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedAt;
  }
  return false; // Chưa đổi mật khẩu lần nào → token vẫn hợp lệ
};

/**
 * toPublicJSON()
 * Trả về object chỉ gồm các field an toàn để gửi xuống client
 * Loại bỏ: password, passwordChangedAt, __v
 */
userSchema.methods.toPublicJSON = function () {
  return {
    id:             this._id,
    name:           this.name,
    email:          this.email,
    role:           this.role,
    avatarUrl:      this.avatarUrl,
    bio:            this.bio,
    reputationScore: this.reputationScore,
    totalReviews:   this.totalReviews,
    isActive:       this.isActive,
    createdAt:      this.createdAt,
  };
};


// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = mongoose.model('User', userSchema);
