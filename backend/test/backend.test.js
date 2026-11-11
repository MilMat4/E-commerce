const assert = require('node:assert/strict');
const test = require('node:test');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { parsePositiveInteger, escapeRegex, isValidObjectId } = require('../utils/validation');
const getJwtSecret = require('../utils/jwtSecret');
const { getOverallOrderStatus } = require('../utils/orderStatus');
const { canSellerViewOrder } = require('../controllers/orderController');
const { createDemoOrder } = require('../controllers/paymentController');
const { registerUser } = require('../controllers/authController');
const { updateProduct, getProducts } = require('../controllers/productController');
const Category = require('../models/Category');
const { authorize } = require('../middleware/authMiddleware');
const { fileFilter } = require('../middleware/uploadMiddleware');
const { verifyPaymentSignature, verifyWebhookSignature } = require('../utils/razorpay');
const { toPaise, fromPaise } = require('../utils/money');
const crypto = require('node:crypto');
const app = require('../app');

const createResponse = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return this;
  },
});

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

test('public registration rejects administrator role assignment', async () => {
  const response = createResponse();
  await registerUser({
    body: {
      name: 'Test Admin',
      email: 'admin@example.test',
      password: 'valid-password',
      role: 'admin',
    },
  }, response);
  assert.equal(response.statusCode, 400);
});

test('authorization middleware rejects customers on admin routes', () => {
  const response = createResponse();
  let continued = false;
  authorize('admin')({ user: { role: 'customer' } }, response, () => { continued = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(continued, false);
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

test('seller order access is limited to visible payments and owned items', () => {
  const sellerId = '507f1f77bcf86cd799439011';
  const otherSellerId = '507f1f77bcf86cd799439012';
  const order = (paymentStatus, itemSeller) => ({
    paymentStatus,
    items: [{ seller: { toString: () => itemSeller } }],
  });

  assert.equal(canSellerViewOrder(order('paid', sellerId), sellerId), true);
  assert.equal(canSellerViewOrder(order('not_required', sellerId), sellerId), true);
  assert.equal(canSellerViewOrder(order('pending', sellerId), sellerId), false);
  assert.equal(canSellerViewOrder(order('paid', otherSellerId), sellerId), false);
});

test('seller cannot modify another seller product', async (t) => {
  const originalFindById = Product.findById;
  t.after(() => { Product.findById = originalFindById; });
  Product.findById = async () => ({
    seller: { toString: () => '507f1f77bcf86cd799439012' },
  });

  const response = createResponse();
  await updateProduct({
    params: { id: '507f1f77bcf86cd799439013' },
    user: { _id: '507f1f77bcf86cd799439011', role: 'seller' },
    body: {},
    files: [],
  }, response);
  assert.equal(response.statusCode, 403);
});

test('product listing applies search, category, price, sorting, and pagination filters', async (t) => {
  const originalDistinct = Category.distinct;
  const originalExists = Category.exists;
  const originalFind = Product.find;
  const originalCountDocuments = Product.countDocuments;
  t.after(() => {
    Category.distinct = originalDistinct;
    Category.exists = originalExists;
    Product.find = originalFind;
    Product.countDocuments = originalCountDocuments;
  });

  const categoryId = '507f1f77bcf86cd799439011';
  const activeCategoryIds = ['507f1f77bcf86cd799439012', categoryId];
  const queryCalls = {};
  Category.distinct = async () => activeCategoryIds;
  Category.exists = async (filter) => filter._id === categoryId && filter.status === 'active';
  Product.find = (filter) => {
    queryCalls.filter = filter;
    const query = {
      populate() { return this; },
      sort(value) { queryCalls.sort = value; return this; },
      skip(value) { queryCalls.skip = value; return this; },
      limit(value) { queryCalls.limit = value; return this; },
      then(resolve, reject) { return Promise.resolve([{ name: 'Canvas bag' }]).then(resolve, reject); },
    };
    return query;
  };
  Product.countDocuments = async (filter) => {
    queryCalls.countFilter = filter;
    return 25;
  };

  const response = createResponse();
  await getProducts({
    query: {
      search: 'canvas',
      category: categoryId,
      minPrice: '10',
      maxPrice: '80',
      sort: 'price-low',
      page: '2',
      limit: '12',
    },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(queryCalls.filter, {
    status: 'active',
    category: categoryId,
    name: { $regex: 'canvas', $options: 'i' },
    price: { $gte: 10, $lte: 80 },
  });
  assert.deepEqual(queryCalls.countFilter, queryCalls.filter);
  assert.deepEqual(queryCalls.sort, { price: 1 });
  assert.equal(queryCalls.skip, 12);
  assert.equal(queryCalls.limit, 12);
  assert.equal(response.payload.total, 25);
  assert.equal(response.payload.pages, 3);
  assert.deepEqual(response.payload.products, [{ name: 'Canvas bag' }]);
});

test('product listing rejects reversed price ranges', async () => {
  const response = createResponse();
  await getProducts({ query: { minPrice: '80', maxPrice: '10' } }, response);
  assert.equal(response.statusCode, 400);
  assert.match(response.payload.message, /minPrice cannot be greater than maxPrice/);
});

test('image upload filter rejects unsupported MIME types and extensions', () => {
  let invalidError;
  fileFilter({}, { mimetype: 'application/octet-stream', originalname: 'payload.exe' }, (error) => {
    invalidError = error;
  });
  assert.match(invalidError.message, /Only JPG, PNG, and WEBP/);

  let accepted = false;
  fileFilter({}, { mimetype: 'image/png', originalname: 'image.png' }, (error, result) => {
    assert.equal(error, null);
    accepted = result;
  });
  assert.equal(accepted, true);
});

test('demo checkout is disabled unless explicitly enabled outside production', async (t) => {
  const previousEnabled = process.env.DEMO_CHECKOUT_ENABLED;
  const previousNodeEnv = process.env.NODE_ENV;
  t.after(() => {
    if (previousEnabled === undefined) delete process.env.DEMO_CHECKOUT_ENABLED;
    else process.env.DEMO_CHECKOUT_ENABLED = previousEnabled;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });

  process.env.DEMO_CHECKOUT_ENABLED = 'false';
  process.env.NODE_ENV = 'development';
  const disabledResponse = createResponse();
  await createDemoOrder({ user: { _id: '507f1f77bcf86cd799439011' } }, disabledResponse);
  assert.equal(disabledResponse.statusCode, 403);

  process.env.DEMO_CHECKOUT_ENABLED = 'true';
  process.env.NODE_ENV = 'production';
  const productionResponse = createResponse();
  await createDemoOrder({ user: { _id: '507f1f77bcf86cd799439011' } }, productionResponse);
  assert.equal(productionResponse.statusCode, 403);
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

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`, {
    headers: { Origin: 'http://localhost:5173' },
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(typeof payload.timestamp, 'string');
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');

  const disallowedOriginResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/health`, {
    headers: { Origin: 'https://not-the-storefront.example' },
  });
  assert.equal(disallowedOriginResponse.headers.get('access-control-allow-origin'), null);
});
