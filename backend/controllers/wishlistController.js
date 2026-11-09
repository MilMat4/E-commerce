const User = require('../models/User');
const Product = require('../models/Product');
const { isValidObjectId } = require('../utils/validation');
const { sendControllerError } = require('../utils/apiError');

const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({
      success: true,
      count: user.wishlist.length,
      wishlist: user.wishlist,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to fetch wishlist.');
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body || {};

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid product ID is required.',
      });
    }

    const product = await Product.findOne({ _id: productId, status: 'active' })
      .populate({ path: 'category', match: { status: 'active' }, select: '_id' });
    if (!product || !product.category) {
      return res.status(404).json({
        success: false,
        message: 'Active product not found.',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const exists = user.wishlist.some((id) => id.toString() === productId);

    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Product already exists in wishlist.',
      });
    }

    user.wishlist.push(productId);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Product added to wishlist.',
      wishlist: user.wishlist,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to add product to wishlist.');
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.wishlist = user.wishlist.filter((id) => id.toString() !== req.params.productId);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Product removed from wishlist.',
      wishlist: user.wishlist,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to remove product from wishlist.');
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
