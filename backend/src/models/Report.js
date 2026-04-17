const mongoose = require('mongoose');

/**
 * MODEL: Report (Báo cáo vi phạm)
 * User có thể báo cáo: track / review / user
 * Admin xem xét và xử lý (resolved / dismissed)
 */
const reportSchema = new mongoose.Schema(
  {
    // Loại đối tượng bị báo cáo
    targetType: {
      type:     String,
      enum:     ['track', 'review', 'user'],
      required: [true, 'Loại đối tượng báo cáo là bắt buộc'],
    },

    // ID đối tượng bị báo cáo (Track / Review / User)
    targetId: {
      type:     mongoose.Schema.Types.ObjectId,
      required: [true, 'ID đối tượng báo cáo là bắt buộc'],
      refPath:  'targetModel', // dynamic ref qua targetModel
    },

    // Dùng refPath để populate đúng model
    targetModel: {
      type:     String,
      enum:     ['Track', 'Review', 'User'],
      required: true,
    },

    // Người gửi báo cáo
    reportedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Người báo cáo là bắt buộc'],
    },

    // Lý do báo cáo
    reason: {
      type:    String,
      enum:    {
        values:  ['spam', 'inappropriate', 'copyright', 'hate', 'other'],
        message: 'Lý do không hợp lệ',
      },
      required: [true, 'Lý do báo cáo là bắt buộc'],
    },

    // Mô tả thêm (tùy chọn)
    description: {
      type:      String,
      default:   '',
      maxlength: [500, 'Mô tả không được vượt quá 500 ký tự'],
      trim:      true,
    },

    // Trạng thái xử lý
    // pending  → chờ Admin xem xét
    // resolved → Admin đã xử lý (xóa nội dung vi phạm)
    // dismissed → Admin bỏ qua (không vi phạm)
    status: {
      type:    String,
      enum:    ['pending', 'resolved', 'dismissed'],
      default: 'pending',
    },

    // Admin xử lý báo cáo
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      default: null,
    },

    resolvedAt: {
      type:    Date,
      default: null,
    },

    // Ghi chú của Admin khi xử lý
    adminNote: {
      type:    String,
      default: '',
      trim:    true,
    },
  },
  { timestamps: true }
);

// ── Index ──────────────────────────────────────────────────
reportSchema.index({ targetType: 1, status: 1 });
reportSchema.index({ reportedBy: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

// Mỗi user chỉ báo cáo một đối tượng 1 lần
reportSchema.index({ reportedBy: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);
