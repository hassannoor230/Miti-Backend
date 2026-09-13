const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const jsondb = require('../utils/jsondb');
const User = require('../models/User');
const { requireCustomer, requireAny, requireRole } = require('../middleware/customerAuth');
const { setCustomerCookie, clearCustomerCookie } = require('../middleware/customerAuth');
const { signCustomerToken } = require('../middleware/customerAuth');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.sub).select('-passwordHash -resetPasswordToken -resetPasswordExpires');
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, data: user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findById(req.auth.sub);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  if (name) user.name = String(name).trim();
  if (phone !== undefined) user.phone = String(phone || '').trim();
  await user.save();
  res.json({ success: true, data: user.toSafeObject() });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(422).json({ success: false, message: 'Current password and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(422).json({ success: false, message: 'New password must be at least 8 characters.' });
  }
  const user = await User.findById(req.auth.sub);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  const ok = await user.comparePassword(currentPassword);
  if (!ok) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  await user.hashPassword(newPassword);
  user.isTemporaryPassword = false;
  await user.save();
  res.json({ success: true, message: 'Password changed successfully.' });
});

module.exports = { me, updateProfile, changePassword };
