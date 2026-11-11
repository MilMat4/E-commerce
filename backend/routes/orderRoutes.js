const express = require('express');
const {
  getOrders,
  getOrderById,
  updateSellerItemStatus,
} = require('../controllers/orderController');
const { createDemoOrder } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getOrders);
router.post('/demo', protect, authorize('customer'), createDemoOrder);
router.put('/:orderId/items/:itemId/fulfillment', protect, authorize('seller'), updateSellerItemStatus);
router.get('/:id', protect, getOrderById);

module.exports = router;
