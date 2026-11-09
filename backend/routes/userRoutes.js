const express = require('express');
const {
  getUsers,
  getUserById,
  updateUserProfile,
  approveSeller,
  rejectSeller,
  updateUserStatus,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, authorize('admin'), getUsers);
router.put('/profile', protect, updateUserProfile);
router.put('/:id/approve-seller', protect, authorize('admin'), approveSeller);
router.put('/:id/reject-seller', protect, authorize('admin'), rejectSeller);
router.put('/:id/status', protect, authorize('admin'), updateUserStatus);
router.get('/:id', protect, getUserById);

module.exports = router;
