// Order model.
// Mirrors the proposal's order structure with item snapshots, totals, and statuses.

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered'],
      default: 'pending',
    },
    inventoryReleased: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'partially_fulfilled', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['demo', 'razorpay'],
      default: 'demo',
    },
    paymentStatus: {
      type: String,
      enum: ['not_required', 'pending', 'paid', 'failed'],
      default: 'not_required',
    },
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    paymentExpiresAt: {
      type: Date,
    },
    shippingAddress: {
      street: String,
      city: String,
      country: String,
      postalCode: String,
    },
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ 'items.seller': 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
