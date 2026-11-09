const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { sendControllerError } = require('../utils/apiError');

const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      approvedSellers,
      pendingSellerApplications,
      activeProducts,
      totalOrders,
      cancelledOrders,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'seller', isApprovedSeller: true, status: 'active' }),
      User.countDocuments({ role: 'seller', status: 'pending', isApprovedSeller: false }),
      Product.countDocuments({ status: 'active' }),
      Order.countDocuments({ paymentStatus: { $in: ['paid', 'not_required'] } }),
      Order.countDocuments({ orderStatus: 'cancelled' }),
    ]);

    return res.status(200).json({
      success: true,
      dashboard: {
        totalUsers,
        approvedSellers,
        pendingSellerApplications,
        activeProducts,
        totalOrders,
        cancelledOrders,
      },
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to load admin dashboard.');
  }
};

const getSellerDashboard = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const lowStockThreshold = 5;
    const [myProducts, lowStockProducts, relevantOrders, pendingOrderActions] = await Promise.all([
      Product.countDocuments({ seller: sellerId }),
      Product.countDocuments({ seller: sellerId, stock: { $lte: lowStockThreshold }, status: 'active' }),
      Order.countDocuments({ 'items.seller': sellerId, paymentStatus: { $in: ['paid', 'not_required'] } }),
      Order.countDocuments({
        paymentStatus: { $in: ['paid', 'not_required'] },
        items: {
          $elemMatch: {
            seller: sellerId,
            fulfillmentStatus: { $in: ['pending', 'confirmed'] },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      dashboard: { myProducts, lowStockProducts, relevantOrders, pendingOrderActions, lowStockThreshold },
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to load seller dashboard.');
  }
};

const getCustomerDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('wishlist cart');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const [totalOrders, pendingOrders] = await Promise.all([
      Order.countDocuments({ customer: user._id, paymentStatus: { $in: ['paid', 'not_required'] } }),
      Order.countDocuments({
        customer: user._id,
        orderStatus: 'pending',
        paymentStatus: { $in: ['paid', 'not_required'] },
      }),
    ]);

    return res.status(200).json({
      success: true,
      dashboard: {
        wishlistItems: user.wishlist.length,
        cartItems: user.cart.reduce((count, item) => count + item.quantity, 0),
        totalOrders,
        pendingOrders,
      },
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to load customer dashboard.');
  }
};

module.exports = {
  getAdminDashboard,
  getSellerDashboard,
  getCustomerDashboard,
};
