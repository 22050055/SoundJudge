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
      unique:   true,
      lowercase: true,
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
      select:    false,
    },

    // ── Vai trò (phân quyền) ────────────────────────────────
    // user: người dùng thường (có thể đăng nhạc VÀ đánh giá)
    // admin: quản trị viên
    role: {
      type:    String,
      enum:    {
        values:  ['user', 'admin'],
        message: 'Role phải là: user hoặc admin',
      },
      default: 'user',
    },

    // ── Hồ sơ cá nhân ──────────────────────────────────────
    avatar: {
      url:      { type: String, default: '' },
      publicId: { type: String, default: '' },
    },

    bio: {
      type:      String,
      default:   '',
      maxlength: [300, 'Giới thiệu không được vượt quá 300 ký tự'],
      trim:      true,
    },

    // ── Mạng xã hội — Follow ────────────────────────────────
    following: [{
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    }],

    followers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    }],

    // ── Thống kê ────────────────────────────────────────────
    totalTracks: {
      type:    Number,
      default: 0,
      min:     0,
    },

    totalReviews: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Trạng thái tài khoản ────────────────────────────────
    // ── Playlist & Yêu thích ───────────────────────────────
    favorites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Track',
    }],

    isActive: {
      type:    Boolean,
      default: true,
    },

    passwordChangedAt: {
      type:   Date,
      select: false,
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
userSchema.index({ role: 1 });
userSchema.index({ name: 'text', email: 'text' });


// ════════════════════════════════════════════════════════════
//  VIRTUAL FIELDS
// ════════════════════════════════════════════════════════════
userSchema.virtual('avatarUrl').get(function () {
  return this.avatar?.url || '';
});

userSchema.virtual('followersCount').get(function () {
  return this.followers?.length || 0;
});

userSchema.virtual('followingCount').get(function () {
  return this.following?.length || 0;
});


// ════════════════════════════════════════════════════════════
//  MIDDLEWARE (HOOKS)
// ════════════════════════════════════════════════════════════
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
  next();
});


// ════════════════════════════════════════════════════════════
//  INSTANCE METHODS
// ════════════════════════════════════════════════════════════
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isPasswordChangedAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedAt = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedAt;
  }
  return false;
};

userSchema.methods.toPublicJSON = function () {
  return {
    id:             this._id,
    name:           this.name,
    email:          this.email,
    role:           this.role,
    avatarUrl:      this.avatarUrl,
    bio:            this.bio,
    totalTracks:    this.totalTracks,
    totalReviews:   this.totalReviews,
    followersCount: this.followersCount,
    followingCount: this.followingCount,
    isActive:       this.isActive,
    createdAt:      this.createdAt,
    favorites:      this.favorites,
  };
};


// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = mongoose.model('User', userSchema);
