const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  getUsers,
  toggleUserStatus,
  updateUser,
  deleteUser,
  deleteTrackAdmin,
  deleteReviewAdmin,
  getReports,
  resolveReport,
  getAllTracks,
  getAllReviews,
} = require('../controllers/admin.controller');

// Áp dụng protect + authorize('admin') cho TẤT CẢ routes trong file này
router.use(protect, authorize('admin'));


// ════════════════════════════════════════════════════════════
//  THỐNG KÊ
// ════════════════════════════════════════════════════════════
router.get('/stats', getDashboardStats);


// ════════════════════════════════════════════════════════════
//  QUẢN LÝ USER
// ════════════════════════════════════════════════════════════
router.get('/users',                getUsers);
router.patch('/users/:id',          updateUser);       // Chỉnh sửa thông tin
router.patch('/users/:id/toggle',   toggleUserStatus); // Khoá/mở khoá
router.delete('/users/:id',         deleteUser);       // Xóa tài khoản


// ════════════════════════════════════════════════════════════
//  QUẢN LÝ TRACK
// ════════════════════════════════════════════════════════════
router.get('/tracks',    getAllTracks);
router.delete('/tracks/:id', deleteTrackAdmin);


// ════════════════════════════════════════════════════════════
//  QUẢN LÝ REVIEW
// ════════════════════════════════════════════════════════════
router.get('/reviews',       getAllReviews);
router.delete('/reviews/:id', deleteReviewAdmin);


// ════════════════════════════════════════════════════════════
//  QUẢN LÝ BÁO CÁO VI PHẠM
// ════════════════════════════════════════════════════════════
router.get('/reports',                  getReports);
router.patch('/reports/:id/resolve',    resolveReport);


module.exports = router;
