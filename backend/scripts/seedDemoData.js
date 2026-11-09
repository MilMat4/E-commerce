// Seed local-only storefront data without changing existing real accounts or orders.
require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const DEMO_USERS = [
  { key: 'makerOne', name: 'Avery Chen', email: 'demo.maker.one@example.test', role: 'seller' },
  { key: 'makerTwo', name: 'Jordan Rivera', email: 'demo.maker.two@example.test', role: 'seller' },
  { key: 'shopperOne', name: 'Riley Morgan', email: 'demo.shopper.one@example.test', role: 'customer' },
  { key: 'shopperTwo', name: 'Sam Taylor', email: 'demo.shopper.two@example.test', role: 'customer' },
  { key: 'shopperThree', name: 'Casey Patel', email: 'demo.shopper.three@example.test', role: 'customer' },
];

const DEMO_CATEGORIES = [
  { key: 'home', name: 'Home & Living', slug: 'morrow-demo-home-living', description: 'Small details that make a space feel like yours.' },
  { key: 'style', name: 'Style & Accessories', slug: 'morrow-demo-style-accessories', description: 'Everyday pieces with a little personality.' },
  { key: 'selfCare', name: 'Self Care', slug: 'morrow-demo-self-care', description: 'Gentle rituals for slower moments.' },
  { key: 'tech', name: 'Audio & Tech', slug: 'morrow-demo-audio-tech', description: 'Useful everyday tech, thoughtfully picked.' },
];

const DEMO_PRODUCTS = [
  {
    key: 'speckledMug', seller: 'makerOne', category: 'home',
    name: 'Speckled Morning Mug', description: 'A hand-finished ceramic mug for slow starts and long coffee breaks.',
    price: 849, stock: 18, image: 'photo-1514228742587-6b1558fcca3d',
  },
  {
    key: 'sunsetVase', seller: 'makerOne', category: 'home',
    name: 'Sunset Ceramic Vase', description: 'A sculptural little vase with a warm glaze and an easy, organic shape.',
    price: 1499, stock: 9, image: 'photo-1578500494198-246f612d3b3d',
  },
  {
    key: 'linenTote', seller: 'makerOne', category: 'style',
    name: 'Everyday Linen Tote', description: 'A roomy, reusable carry-all made for market mornings and everyday errands.',
    price: 1199, stock: 24, image: 'photo-1590874103328-eac38a683ce7',
  },
  {
    key: 'botanicalCandle', seller: 'makerOne', category: 'selfCare',
    name: 'Garden Hour Candle', description: 'A soft botanical scent poured into a reusable amber glass jar.',
    price: 699, stock: 3, image: 'photo-1603006905003-be475563bc59',
  },
  {
    key: 'wirelessHeadphones', seller: 'makerTwo', category: 'tech',
    name: 'Cloudline Wireless Headphones', description: 'Comfort-first over-ear headphones for commutes, focus time, and quiet evenings.',
    price: 3499, stock: 12, image: 'photo-1505740420928-5e560c06d30e',
  },
  {
    key: 'dailyWatch', seller: 'makerTwo', category: 'style',
    name: 'The Daily Watch', description: 'A clean, versatile watch with a soft strap and a minimal everyday face.',
    price: 2299, stock: 7, image: 'photo-1523275335684-37898b6baf30',
  },
  {
    key: 'faceOil', seller: 'makerTwo', category: 'selfCare',
    name: 'Dewdrop Face Oil', description: 'A lightweight botanical face oil made for a calm nighttime routine.',
    price: 949, stock: 15, image: 'photo-1608248543803-ba4f8c70ae0b',
  },
  {
    key: 'deskLamp', seller: 'makerTwo', category: 'home',
    name: 'Little Arc Desk Lamp', description: 'A compact warm-glow lamp that brings a softer light to a desk or bedside table.',
    price: 1899, stock: 6, image: 'photo-1507473885765-e6ed057f782c',
  },
];

const DEMO_ORDERS = [
  { key: 'riley-shipped', customer: 'shopperOne', status: 'shipped', daysAgo: 3, productQuantities: [['speckledMug', 1], ['linenTote', 1]] },
  { key: 'riley-delivered', customer: 'shopperOne', status: 'delivered', daysAgo: 18, productQuantities: [['dailyWatch', 1]] },
  { key: 'sam-pending', customer: 'shopperTwo', status: 'pending', daysAgo: 1, productQuantities: [['botanicalCandle', 2], ['sunsetVase', 1]] },
  { key: 'casey-confirmed', customer: 'shopperThree', status: 'confirmed', daysAgo: 5, productQuantities: [['wirelessHeadphones', 1], ['faceOil', 1]] },
];

const imageUrl = (imageId) => `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=1000&q=82`;

const assertLocalDatabase = () => {
  const uri = process.env.MONGODB_URI;
  const password = process.env.DEMO_PASSWORD;
  if (!uri || !password) {
    throw new Error('Set MONGODB_URI and DEMO_PASSWORD before seeding demo data.');
  }
  if (password.length < 12) {
    throw new Error('DEMO_PASSWORD must contain at least 12 characters.');
  }

  const parsedUri = new URL(uri);
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  const databaseName = decodeURIComponent(parsedUri.pathname.slice(1));
  if (parsedUri.protocol !== 'mongodb:' || !localHosts.has(parsedUri.hostname) || databaseName !== 'mern_ecommerce') {
    throw new Error('Demo seeding is restricted to mongodb://localhost/mern_ecommerce.');
  }
};

const getOrCreateUser = async (definition, password) => {
  let user = await User.findOne({ email: definition.email }).select('+password');
  if (user) {
    if (user.role !== definition.role) {
      throw new Error(`${definition.email} already exists with a different role; no changes were made to it.`);
    }
    if (!(await user.matchPassword(password))) {
      throw new Error(`DEMO_PASSWORD does not match the existing ${definition.email} account; no changes were made to it.`);
    }
    if (user.status !== 'active' || (user.role === 'seller' && !user.isApprovedSeller)) {
      throw new Error(`${definition.email} exists but is not active and approved; update it manually before reseeding.`);
    }
    return user;
  }

  user = await User.create({
    name: definition.name,
    email: definition.email,
    password,
    role: definition.role,
    status: 'active',
    isApprovedSeller: definition.role === 'seller',
    address: {
      street: '42 Sample Lane',
      city: 'Pune',
      country: 'India',
      postalCode: '411001',
    },
  });
  return user;
};

const getOrCreateCategory = async (definition) => {
  let category = await Category.findOne({ slug: definition.slug });
  if (category) return category;
  category = await Category.create({ ...definition, status: 'active' });
  return category;
};

const getOrCreateProduct = async (definition, users, categories) => {
  const seller = users[definition.seller];
  const category = categories[definition.category];
  let product = await Product.findOne({ seller: seller._id, name: definition.name });
  if (product) return product;

  product = await Product.create({
    name: definition.name,
    description: definition.description,
    price: definition.price,
    stock: definition.stock,
    category: category._id,
    seller: seller._id,
    images: [imageUrl(definition.image)],
    status: 'active',
  });
  return product;
};

const addCustomerSamples = async (users, products) => {
  const customerSamples = [
    { key: 'shopperOne', cart: [['speckledMug', 1], ['faceOil', 1]], wishlist: ['sunsetVase', 'dailyWatch', 'deskLamp'] },
    { key: 'shopperTwo', cart: [['linenTote', 1], ['botanicalCandle', 1]], wishlist: ['speckledMug', 'wirelessHeadphones'] },
    { key: 'shopperThree', cart: [['dailyWatch', 1], ['deskLamp', 1]], wishlist: ['linenTote', 'botanicalCandle'] },
  ];

  for (const sample of customerSamples) {
    const user = users[sample.key];
    const wishlistIds = sample.wishlist.map((key) => products[key]._id);
    await User.updateOne(
      { _id: user._id },
      { $addToSet: { wishlist: { $each: wishlistIds } } },
    );

    const cart = sample.cart.map(([key, quantity]) => ({ product: products[key]._id, quantity }));
    await User.updateOne(
      { _id: user._id, 'cart.0': { $exists: false } },
      { $set: { cart } },
    );
  }
};

const seedOrders = async (users, products) => {
  for (const definition of DEMO_ORDERS) {
    const items = definition.productQuantities.map(([key, quantity]) => {
      const product = products[key];
      return {
        product: product._id,
        productName: product.name,
        unitPrice: product.price,
        quantity,
        seller: product.seller,
        fulfillmentStatus: definition.status,
      };
    });
    const totalAmount = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    const orderId = new mongoose.Types.ObjectId(
      crypto.createHash('sha256').update(`morrow-demo-order:${definition.key}`).digest('hex').slice(0, 24),
    );
    const createdAt = new Date(Date.now() - definition.daysAgo * 24 * 60 * 60 * 1000);

    await Order.updateOne(
      { _id: orderId },
      {
        $setOnInsert: {
          customer: users[definition.customer]._id,
          items,
          totalAmount,
          orderStatus: definition.status,
          paymentMethod: 'demo',
          paymentStatus: 'not_required',
          shippingAddress: users[definition.customer].address,
          createdAt,
        },
      },
      { upsert: true },
    );
  }
};

const seedDemoData = async () => {
  assertLocalDatabase();
  await mongoose.connect(process.env.MONGODB_URI);

  const users = {};
  for (const definition of DEMO_USERS) {
    users[definition.key] = await getOrCreateUser(definition, process.env.DEMO_PASSWORD);
  }

  const categories = {};
  for (const definition of DEMO_CATEGORIES) {
    categories[definition.key] = await getOrCreateCategory(definition);
  }

  const products = {};
  for (const definition of DEMO_PRODUCTS) {
    products[definition.key] = await getOrCreateProduct(definition, users, categories);
  }

  await addCustomerSamples(users, products);
  await seedOrders(users, products);

  console.log('Demo storefront data is ready (safe to run again).');
  console.log(`Accounts: ${DEMO_USERS.length} (${DEMO_USERS.filter((user) => user.role === 'seller').length} approved sellers, ${DEMO_USERS.filter((user) => user.role === 'customer').length} customers)`);
  console.log(`Categories: ${DEMO_CATEGORIES.length}; products: ${DEMO_PRODUCTS.length}; sample orders: ${DEMO_ORDERS.length}`);
  console.log('All demo accounts use the password supplied in DEMO_PASSWORD.');
};

seedDemoData()
  .catch((error) => {
    console.error('Demo data setup failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
