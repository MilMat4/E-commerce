const User = require('../models/User');
const { isValidObjectId } = require('../utils/validation');
const { sendControllerError } = require('../utils/apiError');

const getUsers = async (req, res) => {
  try {
    const filter = {};
    if (['customer', 'seller', 'admin'].includes(req.query.role)) {
      filter.role = req.query.role;
    }
    if (['active', 'pending', 'inactive'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const users = await User.find(filter)
      .select('name email role status isApprovedSeller createdAt')
      .sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to fetch users.');
  }
};

const getUserById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'You may only view your own profile.' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Unable to fetch user.');
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { name, email, address } = req.body || {};
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Name must contain at least 2 characters.' });
      }
      updates.name = name.trim();
    }
    if (email !== undefined) {
      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
      }
      updates.email = normalizedEmail;
    }
    if (address !== undefined) {
      if (!address || typeof address !== 'object' || Array.isArray(address)) {
        return res.status(400).json({ success: false, message: 'Address must be an object.' });
      }
      updates.address = {
        street: typeof address.street === 'string' ? address.street.trim() : '',
        city: typeof address.city === 'string' ? address.city.trim() : '',
        country: typeof address.country === 'string' ? address.country.trim() : '',
        postalCode: typeof address.postalCode === 'string' ? address.postalCode.trim() : '',
      };
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Provide at least one profile field to update.' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    return sendControllerError(res, error, 'Profile update failed.');
  }
};

const approveSeller = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid seller ID.' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found.',
      });
    }

    if (user.role !== 'seller') {
      return res.status(400).json({ success: false, message: 'This account is not a seller.' });
    }
    if (user.isApprovedSeller) {
      return res.status(409).json({ success: false, message: 'This seller is already approved.' });
    }

    user.status = 'active';
    user.isApprovedSeller = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Seller approved successfully.',
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
    return sendControllerError(res, error, 'Seller approval failed.');
  }
};

const rejectSeller = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid seller ID.' });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'seller') {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }
    if (user.isApprovedSeller) {
      return res.status(409).json({ success: false, message: 'An approved seller cannot be rejected.' });
    }

    user.status = 'inactive';
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Seller application rejected.',
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
    return sendControllerError(res, error, 'Seller rejection failed.');
  }
};

const updateUserStatus = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }
    const { status } = req.body || {};
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or inactive.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.role === 'admin' && status === 'inactive') {
      return res.status(400).json({ success: false, message: 'Admin accounts cannot be deactivated here.' });
    }

    user.status = status;
    await user.save();
    return res.status(200).json({
      success: true,
      message: 'User status updated.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    return sendControllerError(res, error, 'User status update failed.');
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUserProfile,
  approveSeller,
  rejectSeller,
  updateUserStatus,
};
