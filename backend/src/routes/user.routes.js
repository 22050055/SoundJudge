const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { getUserProfile } = require('../controllers/auth.controller');
const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  reportUser,
} = require('../controllers/follow.controller');

// GET /api/users/:id              — Xem profile người dùng
router.get('/:id', protect, getUserProfile);

// POST /api/users/:id/follow      — Follow
router.post('/:id/follow', protect, authorize('user', 'admin'), followUser);

// DELETE /api/users/:id/follow    — Unfollow
router.delete('/:id/follow', protect, authorize('user', 'admin'), unfollowUser);

// GET /api/users/:id/followers    — Danh sách followers
router.get('/:id/followers', protect, getFollowers);

// GET /api/users/:id/following    — Danh sách following
router.get('/:id/following', protect, getFollowing);

// POST /api/users/:id/report      — Báo cáo user
router.post('/:id/report', protect, authorize('user'), reportUser);


module.exports = router;
