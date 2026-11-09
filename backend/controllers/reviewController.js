const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const { isValidObjectId } = require('../utils/validation');
const { sendControllerError } = require('../utils/apiError');

const verifiedOrderFilter = (productId, customerId) => ({
  customer: customerId,
  paymentStatus: { $in: ['paid', 'not_required'] },
  items: { $elemMatch: { product: productId, fulfillmentStatus: 'delivered' } },
});

const getProductReviews = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }
    if (!(await Product.exists({ _id: req.params.productId }))) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const reviews = await Review.find({ product: req.params.productId, status: 'approved' })
      .populate('customer', 'name')
      .sort({ createdAt: -1 });
    const averageRating = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;
    return res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating: Number(averageRating.toFixed(1)),
      reviews,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to fetch product reviews.');
  }
};

const getReviewEligibility = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }
    const existingReview = await Review.findOne({
      product: req.params.productId,
      customer: req.user._id,
    });
    const hasDeliveredPurchase = await Order.exists(
      verifiedOrderFilter(req.params.productId, req.user._id)
    );
    return res.status(200).json({
      success: true,
      eligible: Boolean(hasDeliveredPurchase && !existingReview),
      reviewed: Boolean(existingReview),
      message: existingReview
        ? 'You have already reviewed this product.'
        : hasDeliveredPurchase
          ? ''
          : 'A delivered order for this product is required before reviewing.',
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to check review eligibility.');
  }
};

const createProductReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, title = '', comment } = req.body || {};
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be a whole number from 1 to 5.' });
    }
    if (typeof title !== 'string' || title.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Review title must be 100 characters or fewer.' });
    }
    if (typeof comment !== 'string' || !comment.trim() || comment.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Review text is required and must be 2000 characters or fewer.' });
    }
    if (!(await Product.exists({ _id: productId }))) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const purchase = await Order.findOne(verifiedOrderFilter(productId, req.user._id))
      .sort({ createdAt: -1 });
    if (!purchase) {
      return res.status(403).json({
        success: false,
        message: 'A delivered order for this product is required before reviewing.',
      });
    }
    const existing = await Review.exists({ product: productId, customer: req.user._id });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this product.' });
    }

    const review = await Review.create({
      product: productId,
      customer: req.user._id,
      order: purchase._id,
      rating,
      title: title.trim(),
      comment: comment.trim(),
      status: 'approved',
    });
    await review.populate('customer', 'name');
    return res.status(201).json({ success: true, message: 'Your review has been published.', review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this product.' });
    }
    return sendControllerError(res, error, 'Unable to create product review.');
  }
};

const getAdminReviews = async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    if (!['all', 'approved', 'blocked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Review status must be all, approved, or blocked.' });
    }
    const filter = status === 'all' ? {} : { status };
    const reviews = await Review.find(filter)
      .populate('customer', 'name email')
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .limit(200);
    return res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to fetch reviews for moderation.');
  }
};

const moderateReview = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid review ID.' });
    }
    const { status, moderationNote = '' } = req.body || {};
    if (!['approved', 'blocked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Review status must be approved or blocked.' });
    }
    if (typeof moderationNote !== 'string' || moderationNote.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Moderation note must be 500 characters or fewer.' });
    }
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: { status, moderationNote: moderationNote.trim() } },
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email')
      .populate('product', 'name');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
    return res.status(200).json({ success: true, message: `Review ${status}.`, review });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to moderate review.');
  }
};

module.exports = {
  getProductReviews,
  getReviewEligibility,
  createProductReview,
  getAdminReviews,
  moderateReview,
};
