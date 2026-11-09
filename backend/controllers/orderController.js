const Order = require('../models/Order');
const { isValidObjectId } = require('../utils/validation');
const { sendControllerError } = require('../utils/apiError');
const { getOverallOrderStatus } = require('../utils/orderStatus');

const sellerOrderView = (order, sellerId) => {
  const sellerItems = order.items.filter((item) => {
    const itemSellerId = item.seller?._id || item.seller;
    return itemSellerId.toString() === sellerId.toString();
  });
  return {
    _id: order._id,
    customer: order.customer,
    items: sellerItems,
    sellerSubtotal: sellerItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    shippingAddress: order.shippingAddress,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

const getOrders = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'customer') filter.customer = req.user._id;
    if (req.user.role === 'seller') {
      filter['items.seller'] = req.user._id;
      filter.paymentStatus = 'paid';
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('customer', 'name')
      .populate('items.product', 'name images')
      .populate('items.seller', 'name');

    const visibleOrders = req.user.role === 'seller'
      ? orders.map((order) => sellerOrderView(order, req.user._id))
      : orders;
    return res.status(200).json({ success: true, count: visibleOrders.length, orders: visibleOrders });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to fetch orders.');
  }
};

const getOrderById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name')
      .populate('items.product', 'name images');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const ownsOrder = order.customer._id.toString() === req.user._id.toString();
    const sellerHasItems = order.items.some((item) => item.seller.toString() === req.user._id.toString());
    if (req.user.role !== 'admin' && !ownsOrder && !sellerHasItems) {
      return res.status(403).json({ success: false, message: 'You are not allowed to view this order.' });
    }

    if (req.user.role === 'seller') {
      return res.status(200).json({ success: true, order: sellerOrderView(order, req.user._id) });
    }
    return res.status(200).json({ success: true, order });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to fetch order.');
  }
};

const updateSellerItemStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { fulfillmentStatus } = req.body || {};
    if (!isValidObjectId(orderId) || !isValidObjectId(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid order or item ID.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cancelled orders cannot be fulfilled.' });
    }
    if (order.paymentStatus !== 'paid') {
      return res.status(409).json({ success: false, message: 'A paid order is required before fulfillment.' });
    }
    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Order item not found.' });
    if (item.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only update fulfillment for your own products.' });
    }

    const nextStatus = {
      pending: 'confirmed',
      confirmed: 'shipped',
      shipped: 'delivered',
    }[item.fulfillmentStatus];
    if (!nextStatus || fulfillmentStatus !== nextStatus) {
      return res.status(400).json({
        success: false,
        message: `This item can only move to ${nextStatus || 'no further status'}.`,
      });
    }

    item.fulfillmentStatus = nextStatus;
    order.orderStatus = getOverallOrderStatus(order.items);
    await order.save();
    return res.status(200).json({
      success: true,
      message: 'Item fulfillment status updated.',
      order: sellerOrderView(order, req.user._id),
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to update item fulfillment status.');
  }
};

module.exports = {
  getOrders,
  getOrderById,
  updateSellerItemStatus,
};
