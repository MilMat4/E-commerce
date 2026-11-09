const express = require('express');
const { getCart, addToCart, updateCartItem, removeFromCart } = require('../controllers/cartController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, authorize('customer'), getCart);
router.post('/add', protect, authorize('customer'), addToCart);
router.put('/update', protect, authorize('customer'), updateCartItem);
router.delete('/remove/:productId', protect, authorize('customer'), removeFromCart);

module.exports = router;
