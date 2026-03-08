const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  getUsers,
  toggleUserStatus,
  deleteTrackAdmin,
} = require('../controllers/admin.controller');


// ════════════════════════════════════════════════════════════
//  BẢO VỆ TOÀN BỘ ADMIN ROUTES
// ════════════════════════════════════════════════════════════

/**
 * Áp dụng protect + authorize('admin') cho TẤT CẢ route trong file này.
 * Nhờ router.use() ở đây, không cần lặp lại middleware ở từng route riêng lẻ.
 *
 * Thứ tự quan trọng: protect phải chạy trước authorize
 *   protect   → xác thực JWT, gán req.user
 *   authorize → kiểm tra req.user.role === 'admin'
 */
router.use(protect, authorize('admin'));


// ════════════════════════════════════════════════════════════
//  SWAGGER TAGS
// ════════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Quản trị hệ thống — chỉ Admin
 */


// ════════════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Thống kê tổng quan cho Dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalUsers:          { type: integer }
 *                     totalTracks:         { type: integer }
 *                     totalApprovedReviews:{ type: integer }
 *                     pendingReviews:      { type: integer }
 *                 usersByRole:    { type: object }
 *                 tracksByStatus: { type: object }
 */
router.get('/stats', getDashboardStats);


/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Lấy danh sách tất cả người dùng (có lọc, tìm kiếm, phân trang)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page,     schema: { type: integer }, description: Trang hiện tại }
 *       - { in: query, name: limit,    schema: { type: integer }, description: Số item mỗi trang }
 *       - { in: query, name: role,     schema: { type: string, enum: [artist,reviewer,admin] } }
 *       - { in: query, name: isActive, schema: { type: string, enum: ['true','false'] } }
 *       - { in: query, name: search,   schema: { type: string }, description: Tìm theo tên hoặc email }
 *     responses:
 *       200: { description: Thành công }
 */
router.get('/users', getUsers);


/**
 * @swagger
 * /api/admin/users/{id}/toggle:
 *   patch:
 *     summary: Khoá hoặc mở khoá tài khoản người dùng
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Thành công, trả về trạng thái mới }
 *       400: { description: Không thể khoá chính mình }
 *       404: { description: Không tìm thấy người dùng }
 */
router.patch('/users/:id/toggle', toggleUserStatus);


/**
 * @swagger
 * /api/admin/tracks/{id}:
 *   delete:
 *     summary: Admin xoá bất kỳ bài nhạc vi phạm nào
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Xoá thành công }
 *       404: { description: Không tìm thấy bài nhạc }
 */
router.delete('/tracks/:id', deleteTrackAdmin);


module.exports = router;
