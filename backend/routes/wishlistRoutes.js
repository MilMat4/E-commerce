const express = require('express');
const { getWishlist, addToWishlist, removeFromWishlist } = require('../controllers/wishlistController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, authorize('customer'), getWishlist);
router.post('/add', protect, authorize('customer'), addToWishlist);
router.delete('/remove/:productId', protect, authorize('customer'), removeFromWishlist);

module.exports = router;
