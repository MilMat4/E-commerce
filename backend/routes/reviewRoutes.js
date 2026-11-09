const express = require('express');
const {
  getProductReviews,
  getReviewEligibility,
  createProductReview,
  getAdminReviews,
  moderateReview,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/products/:productId/eligibility', protect, authorize('customer'), getReviewEligibility);
router.get('/products/:productId', getProductReviews);
router.post('/products/:productId', protect, authorize('customer'), createProductReview);
router.get('/', protect, authorize('admin'), getAdminReviews);
router.put('/:id/moderation', protect, authorize('admin'), moderateReview);

module.exports = router;
