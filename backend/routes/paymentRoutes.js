const express = require('express');
const {
  createPaymentOrder,
  verifyPayment,
  cancelPaymentOrder,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/razorpay/order', protect, authorize('customer'), createPaymentOrder);
router.post('/razorpay/verify', protect, authorize('customer'), verifyPayment);
router.post('/razorpay/order/:id/cancel', protect, authorize('customer'), cancelPaymentOrder);

module.exports = router;
