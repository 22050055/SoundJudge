const { protect, authorize, optionalProtect } = require('../middleware/auth');
const { getUserProfile } = require('../controllers/auth.controller');
const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  reportUser,
} = require('../controllers/follow.controller');

// GET /api/users/:id              — Xem profile người dùng
router.get('/:id', optionalProtect, getUserProfile);

// POST /api/users/:id/follow      — Follow
router.post('/:id/follow', protect, authorize('user', 'admin'), followUser);

// DELETE /api/users/:id/follow    — Unfollow
router.delete('/:id/follow', protect, authorize('user', 'admin'), unfollowUser);

// GET /api/users/:id/followers    — Danh sách followers
router.get('/:id/followers', optionalProtect, getFollowers);

// GET /api/users/:id/following    — Danh sách following
router.get('/:id/following', optionalProtect, getFollowing);

// POST /api/users/:id/report      — Báo cáo user
router.post('/:id/report', protect, authorize('user'), reportUser);


module.exports = router;
