const dotenv = require('dotenv');

dotenv.config();

const app = require('./app');
const { expirePendingPayments } = require('./controllers/paymentController');
const connectDB = require('./config/db');
const getJwtSecret = require('./utils/jwtSecret');

const startServer = async () => {
  const port = Number(process.env.PORT || 5000);

  getJwtSecret();

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port number.');
  }

  await connectDB();

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  const paymentCleanup = setInterval(() => {
    expirePendingPayments().catch((error) => {
      console.error('Could not expire pending Razorpay payments:', error);
    });
  }, 60 * 1000);
  paymentCleanup.unref();
  expirePendingPayments().catch((error) => {
    console.error('Could not expire pending Razorpay payments:', error);
  });
};

startServer().catch((error) => {
  console.error('Backend startup failed:', error.message);
  process.exitCode = 1;
});
