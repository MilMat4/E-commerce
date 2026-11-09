const crypto = require('crypto');
const Razorpay = require('razorpay');

const createRazorpayClient = () => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET
    || RAZORPAY_KEY_ID.startsWith('replace_')
    || RAZORPAY_KEY_SECRET.startsWith('replace_')) {
    const error = new Error('Razorpay test keys are not configured on the backend.');
    error.statusCode = 503;
    throw error;
  }
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
};

const verifyPaymentSignature = ({ orderId, paymentId, signature, secret }) => {
  if (![orderId, paymentId, signature, secret].every((value) => typeof value === 'string' && value.length)) {
    return false;
  }
  if (!/^[a-f\d]{64}$/i.test(signature)) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};

const verifyWebhookSignature = ({ body, signature, secret }) => {
  if (!Buffer.isBuffer(body) || typeof signature !== 'string' || typeof secret !== 'string' || !secret) {
    return false;
  }
  if (!/^[a-f\d]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};

module.exports = { createRazorpayClient, verifyPaymentSignature, verifyWebhookSignature };
