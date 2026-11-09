const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const { parsePositiveInteger, isValidObjectId } = require('../utils/validation');
const { sendControllerError } = require('../utils/apiError');
const { toPaise, fromPaise } = require('../utils/money');
const {
  createRazorpayClient,
  verifyPaymentSignature,
  verifyWebhookSignature,
} = require('../utils/razorpay');

const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

const restoreReservedStock = async (order) => {
  for (const item of order.items) {
    const claimedOrder = await Order.findOneAndUpdate(
      { _id: order._id, items: { $elemMatch: { _id: item._id, inventoryReleased: false } } },
      { $set: { 'items.$.inventoryReleased': true } },
      { new: true }
    );
    if (!claimedOrder) continue;

    try {
      const result = await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
      if (result.matchedCount !== 1) throw new Error(`Reserved product ${item.product} no longer exists.`);
    } catch (error) {
      await Order.updateOne(
        { _id: order._id, items: { $elemMatch: { _id: item._id, inventoryReleased: true } } },
        { $set: { 'items.$.inventoryReleased': false } }
      );
      throw error;
    }
  }
};

const clearPurchasedCartItems = async (order) => {
  const user = await User.findById(order.customer);
  if (!user) return;

  for (const item of order.items) {
    const cartItem = user.cart.find((entry) => entry.product.toString() === item.product.toString());
    if (!cartItem) continue;
    cartItem.quantity -= item.quantity;
    if (cartItem.quantity <= 0) user.cart = user.cart.filter((entry) => entry !== cartItem);
  }
  await user.save();
};

const verifyAndMarkPaid = async ({ order, paymentId }) => {
  if (order.paymentStatus === 'paid') {
    if (order.razorpayPaymentId !== paymentId) {
      const error = new Error('This order was already completed with a different payment.');
      error.statusCode = 409;
      throw error;
    }
    return order;
  }
  if (order.paymentStatus !== 'pending') {
    const error = new Error('This payment order is no longer available.');
    error.statusCode = 409;
    throw error;
  }

  const razorpay = createRazorpayClient();
  const payment = await razorpay.payments.fetch(paymentId);
  if (payment.order_id !== order.razorpayOrderId
    || payment.amount !== toPaise(order.totalAmount)
    || payment.currency !== 'INR'
    || payment.status !== 'captured') {
    const error = new Error('Razorpay has not confirmed a captured payment for this order.');
    error.statusCode = 409;
    throw error;
  }

  const paidOrder = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: 'pending' },
    { $set: { paymentStatus: 'paid', razorpayPaymentId: paymentId } },
    { new: true }
  );
  if (!paidOrder) {
    const error = new Error('This payment order expired before confirmation. Contact support if you were charged.');
    error.statusCode = 409;
    throw error;
  }
  await clearPurchasedCartItems(paidOrder);
  return paidOrder;
};

const createPaymentOrder = async (req, res) => {
  const stockUpdates = [];
  let localOrder;
  try {
    const razorpay = createRazorpayClient();
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (!user.cart?.length) {
      return res.status(400).json({ success: false, message: 'Your cart is empty.' });
    }

    const address = req.body?.shippingAddress;
    if (!address || typeof address !== 'object' || Array.isArray(address)
      || !['street', 'city', 'country', 'postalCode'].every((field) => (
        typeof address[field] === 'string' && address[field].trim()
      ))) {
      return res.status(400).json({ success: false, message: 'Complete your shipping address before payment.' });
    }

    const pendingOrder = await Order.findOne({
      customer: user._id,
      paymentStatus: 'pending',
      paymentExpiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (pendingOrder) {
      const sameCart = pendingOrder.items.length === user.cart.length
        && pendingOrder.items.every((item) => user.cart.some((cartItem) => (
          cartItem.product.toString() === item.product.toString()
          && cartItem.quantity === item.quantity
        )));
      const sameAddress = ['street', 'city', 'country', 'postalCode'].every((field) => (
        pendingOrder.shippingAddress[field] === address[field].trim()
      ));
      if (!sameCart || !sameAddress || !pendingOrder.razorpayOrderId) {
        return res.status(409).json({
          success: false,
          message: 'You already have a pending checkout. Finish or close it before starting another.',
        });
      }
      return res.status(200).json({
        success: true,
        keyId: process.env.RAZORPAY_KEY_ID,
        order: {
          id: pendingOrder._id,
          razorpayOrderId: pendingOrder.razorpayOrderId,
          amount: toPaise(pendingOrder.totalAmount),
          currency: 'INR',
          expiresAt: pendingOrder.paymentExpiresAt,
        },
      });
    }

    const items = [];
    let totalAmountPaise = 0;
    for (const cartItem of user.cart) {
      const quantity = parsePositiveInteger(cartItem.quantity);
      if (!quantity || !isValidObjectId(cartItem.product)) {
        const error = new Error('Cart contains an invalid item. Remove it and try again.');
        error.statusCode = 400;
        throw error;
      }

      const product = await Product.findOneAndUpdate(
        { _id: cartItem.product, status: 'active', stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );
      if (!product) {
        const error = new Error('A cart product is unavailable or has insufficient stock.');
        error.statusCode = 400;
        throw error;
      }
      stockUpdates.push({ productId: product._id, quantity });
      if (!(await Category.exists({ _id: product.category, status: 'active' }))) {
        const error = new Error('A cart product belongs to an inactive category.');
        error.statusCode = 400;
        throw error;
      }
      const unitPricePaise = toPaise(product.price);
      items.push({
        product: product._id,
        productName: product.name,
        unitPrice: fromPaise(unitPricePaise),
        quantity,
        seller: product.seller,
      });
      totalAmountPaise += unitPricePaise * quantity;
    }

    const totalAmount = fromPaise(totalAmountPaise);
    localOrder = await Order.create({
      customer: user._id,
      items,
      totalAmount,
      orderStatus: 'pending',
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      paymentExpiresAt: new Date(Date.now() + PAYMENT_WINDOW_MS),
      shippingAddress: Object.fromEntries(
        ['street', 'city', 'country', 'postalCode'].map((field) => [field, address[field].trim()])
      ),
    });

    const gatewayOrder = await razorpay.orders.create({
      amount: totalAmountPaise,
      currency: 'INR',
      receipt: localOrder._id.toString(),
      notes: { local_order_id: localOrder._id.toString() },
    });
    localOrder.razorpayOrderId = gatewayOrder.id;
    await localOrder.save();

    return res.status(201).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      order: {
        id: localOrder._id,
        razorpayOrderId: gatewayOrder.id,
        amount: gatewayOrder.amount,
        currency: gatewayOrder.currency,
        expiresAt: localOrder.paymentExpiresAt,
      },
    });
  } catch (error) {
    let recoveryFailed = false;
    if (localOrder) {
      try {
        await Order.deleteOne({ _id: localOrder._id, paymentStatus: 'pending' });
      } catch (recoveryError) {
        recoveryFailed = true;
        console.error('Could not remove incomplete payment order:', recoveryError);
      }
    }
    const results = await Promise.allSettled(stockUpdates.map(({ productId, quantity }) => (
      Product.updateOne({ _id: productId }, { $inc: { stock: quantity } })
    )));
    results.forEach((result) => {
      if (result.status === 'rejected') {
        recoveryFailed = true;
        console.error('Could not restore stock after payment-order setup failed:', result.reason);
      }
    });
    if (recoveryFailed) {
      return res.status(500).json({ success: false, message: 'Payment setup failed and inventory recovery needs administrator review.' });
    }
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    return sendControllerError(res, error, 'Unable to start Razorpay checkout.');
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id: gatewayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    if (typeof gatewayOrderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') {
      return res.status(400).json({ success: false, message: 'Razorpay payment details are incomplete.' });
    }
    const order = await Order.findOne({ razorpayOrderId: gatewayOrderId, customer: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Payment order not found.' });
    if (!verifyPaymentSignature({
      orderId: gatewayOrderId,
      paymentId,
      signature,
      secret: process.env.RAZORPAY_KEY_SECRET,
    })) {
      return res.status(400).json({ success: false, message: 'Razorpay payment signature is invalid.' });
    }

    const paidOrder = await verifyAndMarkPaid({ order, paymentId });
    return res.status(200).json({
      success: true,
      message: 'Payment confirmed and order placed.',
      order: paidOrder,
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    return sendControllerError(res, error, 'Unable to verify Razorpay payment.');
  }
};

const cancelPaymentOrder = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Payment order not found.' });
    if (order.paymentStatus !== 'pending') {
      return res.status(200).json({ success: true, paymentStatus: order.paymentStatus });
    }

    const razorpay = createRazorpayClient();
    const attempts = await razorpay.orders.fetchPayments(order.razorpayOrderId);
    if (attempts.items.some((payment) => ['authorized', 'captured'].includes(payment.status))) {
      return res.status(409).json({
        success: false,
        message: 'A payment is still processing. Wait for confirmation before trying again.',
      });
    }

    const cancelled = await Order.findOneAndUpdate(
      { _id: order._id, customer: req.user._id, paymentStatus: 'pending' },
      { $set: { paymentStatus: 'failed' } },
      { new: true }
    );
    if (cancelled) await restoreReservedStock(cancelled);
    return res.status(200).json({ success: true, paymentStatus: 'failed' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    return sendControllerError(res, error, 'Unable to cancel pending Razorpay checkout.');
  }
};

const razorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!verifyWebhookSignature({ body: req.body, signature, secret })) {
    return res.status(400).json({ success: false, message: 'Razorpay webhook signature is invalid.' });
  }

  try {
    const event = JSON.parse(req.body.toString('utf8'));
    if (event.event !== 'payment.captured') {
      return res.status(200).json({ success: true, received: true });
    }
    const payment = event.payload?.payment?.entity;
    if (!payment?.order_id || !payment?.id) {
      return res.status(400).json({ success: false, message: 'Captured payment data is incomplete.' });
    }
    const order = await Order.findOne({ razorpayOrderId: payment.order_id });
    if (!order) return res.status(200).json({ success: true, received: true });
    if (payment.amount !== toPaise(order.totalAmount) || payment.currency !== 'INR') {
      return res.status(400).json({ success: false, message: 'Captured payment does not match the order amount.' });
    }
    const paidOrder = await verifyAndMarkPaid({ order, paymentId: payment.id });
    return res.status(200).json({ success: true, orderId: paidOrder._id });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    console.error('Razorpay webhook processing failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to process Razorpay webhook.' });
  }
};

const expirePendingPayments = async () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET
    || process.env.RAZORPAY_KEY_ID.startsWith('replace_')
    || process.env.RAZORPAY_KEY_SECRET.startsWith('replace_')) return;
  const razorpay = createRazorpayClient();
  const pendingOrders = await Order.find({
    $or: [
      { paymentStatus: 'pending', paymentExpiresAt: { $lte: new Date() } },
      { paymentStatus: 'failed', items: { $elemMatch: { inventoryReleased: false } } },
    ],
  }).limit(50);

  for (const order of pendingOrders) {
    try {
      if (order.paymentStatus === 'pending') {
        const attempts = order.razorpayOrderId
          ? await razorpay.orders.fetchPayments(order.razorpayOrderId)
          : { items: [] };
        if (attempts.items.some((payment) => ['authorized', 'captured'].includes(payment.status))) continue;

        const expired = await Order.findOneAndUpdate(
          { _id: order._id, paymentStatus: 'pending', paymentExpiresAt: { $lte: new Date() } },
          { $set: { paymentStatus: 'failed' } },
          { new: true }
        );
        if (expired) await restoreReservedStock(expired);
      } else {
        await restoreReservedStock(order);
      }
    } catch (error) {
      console.error(`Could not expire unpaid order ${order._id}:`, error);
    }
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  cancelPaymentOrder,
  razorpayWebhook,
  expirePendingPayments,
};
