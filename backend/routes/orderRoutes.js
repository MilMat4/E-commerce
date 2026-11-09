const express = require('express');
const {
  getOrders,
  getOrderById,
  updateSellerItemStatus,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getOrders);
router.put('/:orderId/items/:itemId/fulfillment', protect, authorize('seller'), updateSellerItemStatus);
router.get('/:id', protect, getOrderById);

module.exports = router;
