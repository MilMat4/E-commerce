// Create the first local administrator using credentials supplied in .env.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const getJwtSecret = require('../utils/jwtSecret');

const seedAdmin = async () => {
  const { MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGODB_URI || !ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in .env first.');
  }
  if (ADMIN_PASSWORD.length < 8) {
    throw new Error('ADMIN_PASSWORD must contain at least 8 characters.');
  }
  if (/^(replace|change)_/i.test(ADMIN_PASSWORD)) {
    throw new Error('Replace the placeholder ADMIN_PASSWORD with a private password first.');
  }
  getJwtSecret();

  await mongoose.connect(MONGODB_URI);

  if (await User.exists({ role: 'admin' })) {
    console.log('An admin account already exists; no changes were made.');
    return;
  }

  if (await User.exists({ email: ADMIN_EMAIL.trim().toLowerCase() })) {
    throw new Error('ADMIN_EMAIL already belongs to a non-admin user. Choose a different email.');
  }

  const admin = await User.create({
    name: ADMIN_NAME.trim(),
    email: ADMIN_EMAIL.trim().toLowerCase(),
    password: ADMIN_PASSWORD,
    role: 'admin',
    status: 'active',
  });

  console.log(`Created local admin account: ${admin.email}`);
};

seedAdmin()
  .catch((error) => {
    console.error('Admin setup failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });