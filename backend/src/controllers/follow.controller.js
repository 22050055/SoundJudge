const User   = require('../models/User');
const Report = require('../models/Report');

// ════════════════════════════════════════════════════════════
//  CONTROLLER 1: FOLLOW USER
// ════════════════════════════════════════════════════════════
/**
 * @route   POST /api/users/:id/follow
 * @access  Private — user
 */
const followUser = async (req, res) => {
  try {
    const targetId  = req.params.id;
    const currentId = req.user._id.toString();

    if (targetId === currentId) {
      return res.status(400).json({ success: false, message: 'Bạn không thể follow chính mình' });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    const currentUser = await User.findById(currentId);

    // Kiểm tra đã follow chưa
    if (currentUser.following.includes(targetId)) {
      return res.status(400).json({ success: false, message: 'Bạn đã follow người này rồi' });
    }

    // Thêm vào following / followers
    await User.findByIdAndUpdate(currentId, { $push: { following: targetId } });
    await User.findByIdAndUpdate(targetId,  { $push: { followers: currentId } });

    res.status(200).json({ success: true, message: `Đã follow ${target.name}` });

  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
    console.error('[followUser]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 2: UNFOLLOW USER
// ════════════════════════════════════════════════════════════
/**
 * @route   DELETE /api/users/:id/follow
 * @access  Private — user
 */
const unfollowUser = async (req, res) => {
  try {
    const targetId  = req.params.id;
    const currentId = req.user._id.toString();

    if (targetId === currentId) {
      return res.status(400).json({ success: false, message: 'Bạn không thể unfollow chính mình' });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    await User.findByIdAndUpdate(currentId, { $pull: { following: targetId } });
    await User.findByIdAndUpdate(targetId,  { $pull: { followers: currentId } });

    res.status(200).json({ success: true, message: `Đã unfollow ${target.name}` });

  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
    console.error('[unfollowUser]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 3: LẤY DANH SÁCH FOLLOWERS
// ════════════════════════════════════════════════════════════
/**
 * @route   GET /api/users/:id/followers
 * @access  Private
 */
const getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'name avatarUrl bio totalTracks totalReviews');

    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    res.status(200).json({ success: true, followers: user.followers, count: user.followers.length });

  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    console.error('[getFollowers]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 4: LẤY DANH SÁCH FOLLOWING
// ════════════════════════════════════════════════════════════
/**
 * @route   GET /api/users/:id/following
 * @access  Private
 */
const getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('following', 'name avatarUrl bio totalTracks totalReviews');

    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    res.status(200).json({ success: true, following: user.following, count: user.following.length });

  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    console.error('[getFollowing]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  CONTROLLER 5: BÁO CÁO USER
// ════════════════════════════════════════════════════════════
/**
 * @route   POST /api/users/:id/report
 * @access  Private — user
 */
const reportUser = async (req, res) => {
  try {
    const targetId  = req.params.id;
    const currentId = req.user._id.toString();

    if (targetId === currentId) {
      return res.status(400).json({ success: false, message: 'Bạn không thể báo cáo chính mình' });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    const { reason, description } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Vui lòng chọn lý do báo cáo' });

    const existing = await Report.findOne({ reportedBy: currentId, targetId });
    if (existing) return res.status(400).json({ success: false, message: 'Bạn đã báo cáo người này rồi' });

    await Report.create({
      targetType:  'user',
      targetId,
      targetModel: 'User',
      reportedBy:  currentId,
      reason,
      description: description?.trim() || '',
    });

    res.status(201).json({ success: true, message: 'Báo cáo đã được gửi thành công' });

  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Bạn đã báo cáo người này rồi' });
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    console.error('[reportUser]', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════
module.exports = { followUser, unfollowUser, getFollowers, getFollowing, reportUser };
