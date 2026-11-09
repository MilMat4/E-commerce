const User = require('../models/User');
const Product = require('../models/Product');
const { isValidObjectId, parsePositiveInteger } = require('../utils/validation');
const { sendControllerError } = require('../utils/apiError');

const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('cart.product');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({
      success: true,
      cart: user.cart,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Could not retrieve cart.');
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body || {};
    const parsedQuantity = parsePositiveInteger(quantity);
    if (!isValidObjectId(productId) || !parsedQuantity) {
      return res.status(400).json({ success: false, message: 'Provide a valid product ID and positive whole-number quantity.' });
    }

    const product = await Product.findOne({ _id: productId, status: 'active' })
      .populate({ path: 'category', match: { status: 'active' }, select: '_id' });
    if (!product || !product.category) {
      return res.status(404).json({ success: false, message: 'Active product not found.' });
    }
    if (parsedQuantity > product.stock) {
      return res.status(400).json({ success: false, message: 'Requested quantity exceeds available stock.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const existingItem = user.cart.find((item) => item.product.toString() === productId);

    const updatedQuantity = (existingItem?.quantity || 0) + parsedQuantity;
    if (updatedQuantity > product.stock) {
      return res.status(400).json({ success: false, message: 'Cart quantity exceeds available stock.' });
    }
    if (existingItem) existingItem.quantity = updatedQuantity;
    else user.cart.push({ product: productId, quantity: parsedQuantity });

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Item added to cart.',
      cart: user.cart,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to add to cart.');
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body || {};
    const parsedQuantity = parsePositiveInteger(quantity);
    if (!isValidObjectId(productId) || !parsedQuantity) {
      return res.status(400).json({ success: false, message: 'Provide a valid product ID and positive whole-number quantity.' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const item = user.cart.find((entry) => entry.product.toString() === productId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found.',
      });
    }

    const product = await Product.findOne({ _id: productId, status: 'active' })
      .populate({ path: 'category', match: { status: 'active' }, select: '_id' });
    if (!product || !product.category) return res.status(404).json({ success: false, message: 'Active product not found.' });
    if (parsedQuantity > product.stock) {
      return res.status(400).json({ success: false, message: 'Requested quantity exceeds available stock.' });
    }

    item.quantity = parsedQuantity;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Cart updated.',
      cart: user.cart,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to update cart.');
  }
};

const removeFromCart = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.cart = user.cart.filter((item) => item.product.toString() !== req.params.productId);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      cart: user.cart,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to remove cart item.');
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
};
