const assert = require('node:assert/strict');
const test = require('node:test');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { parsePositiveInteger, escapeRegex, isValidObjectId } = require('../utils/validation');
const getJwtSecret = require('../utils/jwtSecret');
const { getOverallOrderStatus } = require('../utils/orderStatus');
const { verifyPaymentSignature, verifyWebhookSignature } = require('../utils/razorpay');
const { toPaise, fromPaise } = require('../utils/money');
const crypto = require('node:crypto');
const app = require('../app');

test('positive integer parser rejects invalid cart quantities', () => {
  assert.equal(parsePositiveInteger('3'), 3);
  assert.equal(parsePositiveInteger('0'), null);
  assert.equal(parsePositiveInteger('-1'), null);
  assert.equal(parsePositiveInteger('1.5'), null);
  assert.equal(parsePositiveInteger('abc'), null);
});

test('ObjectId validator and regex escaping handle user-provided values', () => {
  assert.equal(isValidObjectId('507f1f77bcf86cd799439011'), true);
  assert.equal(isValidObjectId('not-an-id'), false);
  assert.match('a+b headphones', new RegExp(escapeRegex('a+b')));
  assert.doesNotMatch('aaab headphones', new RegExp(escapeRegex('a+b')));
});

test('JWT configuration rejects placeholder secrets', (t) => {
  const previousSecret = process.env.JWT_SECRET;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  process.env.JWT_SECRET = 'generate_a_private_random_secret_at_least_32_characters';
  assert.throws(() => getJwtSecret(), /private random value/);
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-this-unit-test';
  assert.equal(getJwtSecret(), process.env.JWT_SECRET);
});

test('user, product, and order schemas reject unsupported roles and statuses', () => {
  const user = new User({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password1',
    role: 'root',
  });
  assert.equal(user.validateSync().errors.role.kind, 'enum');

  const product = new Product({
    name: 'Sample',
    description: 'Sample product',
    price: 10,
    stock: -1,
  });
  assert.equal(product.validateSync().errors.stock.kind, 'min');

  const order = new Order({
    customer: '507f1f77bcf86cd799439011',
    totalAmount: 10,
    orderStatus: 'shipped-now',
  });
  assert.equal(order.validateSync().errors.orderStatus.kind, 'enum');
});

test('review schema validates rating and moderation status', () => {
  const review = new Review({
    product: '507f1f77bcf86cd799439011',
    customer: '507f1f77bcf86cd799439012',
    order: '507f1f77bcf86cd799439013',
    rating: 6,
    comment: 'A review',
    status: 'pending',
  });
  const validation = review.validateSync();
  assert.equal(validation.errors.rating.kind, 'max');
  assert.equal(validation.errors.status.kind, 'enum');
});

test('overall fulfillment is derived from seller-managed item statuses', () => {
  assert.equal(getOverallOrderStatus([{ fulfillmentStatus: 'pending' }]), 'pending');
  assert.equal(getOverallOrderStatus([
    { fulfillmentStatus: 'shipped' },
    { fulfillmentStatus: 'delivered' },
  ]), 'partially_fulfilled');
  assert.equal(getOverallOrderStatus([
    { fulfillmentStatus: 'delivered' },
    { fulfillmentStatus: 'delivered' },
  ]), 'delivered');
});

test('Razorpay checkout and webhook signatures are verified with HMAC', () => {
  const secret = 'test-secret';
  const orderId = 'order_test';
  const paymentId = 'pay_test';
  const paymentSignature = crypto.createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const body = Buffer.from('{"event":"payment.captured"}');
  const webhookSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  assert.equal(verifyPaymentSignature({ orderId, paymentId, signature: paymentSignature, secret }), true);
  assert.equal(verifyPaymentSignature({ orderId, paymentId, signature: 'invalid', secret }), false);
  assert.equal(verifyWebhookSignature({ body, signature: webhookSignature, secret }), true);
  assert.equal(verifyWebhookSignature({ body, signature: paymentSignature, secret }), false);
});

test('checkout prices are normalized to whole paise before totals are calculated', () => {
  const unitPricePaise = toPaise(1.005);
  const largerUnitPricePaise = toPaise(1000.005);
  const totalPaise = unitPricePaise * 3;

  assert.equal(unitPricePaise, 101);
  assert.equal(largerUnitPricePaise, 100001);
  assert.equal(fromPaise(unitPricePaise), 1.01);
  assert.equal(fromPaise(totalPaise), 3.03);
});

test('health route responds without requiring a database connection', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(typeof payload.timestamp, 'string');
});
