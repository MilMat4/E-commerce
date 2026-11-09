// Authentication controller.
// Handles registration, login and token issuing.

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const getJwtSecret = require('../utils/jwtSecret');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role = 'customer' } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (typeof name !== 'string' || name.trim().length < 2
      || typeof password !== 'string' || password.length < 6
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Provide a name (at least 2 characters), valid email, and password (at least 6 characters).',
      });
    }

    if (!['customer', 'seller'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Public registration is limited to customer and seller accounts.',
      });
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const safeRole = role === 'seller' ? 'seller' : 'customer';

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: safeRole,
      status: safeRole === 'seller' ? 'pending' : 'active',
      isApprovedSeller: false,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: 'Registration failed.' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provide a valid email address and password.',
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'This account is inactive. Contact an administrator.',
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isApprovedSeller: user.isApprovedSeller,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
      isApprovedSeller: req.user.isApprovedSeller,
    },
  });
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};
