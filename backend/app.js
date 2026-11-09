// app.js centralizes the Express application setup.
// We register middleware, static files and all route groups here.

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();

app.post(
  '/api/payments/razorpay/webhook',
  express.raw({ type: 'application/json' }),
  require('./controllers/paymentController').razorpayWebhook
);

// ---------------------------
// Global middleware
// ---------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve uploaded product images from the local uploads folder.
// This mirrors the project proposal's local-file-storage idea.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------------------
// Routes
// ---------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is running successfully.',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// ---------------------------
// Error handling
// ---------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be 5 MB or smaller.'
        : err.message,
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: statusCode < 500 ? err.message : 'Server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

module.exports = app;
