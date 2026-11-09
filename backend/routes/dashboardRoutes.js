const express = require('express');
const {
  getAdminDashboard,
  getSellerDashboard,
  getCustomerDashboard,
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/admin', protect, authorize('admin'), getAdminDashboard);
router.get('/seller', protect, authorize('seller'), getSellerDashboard);
router.get('/customer', protect, authorize('customer'), getCustomerDashboard);

module.exports = router;
