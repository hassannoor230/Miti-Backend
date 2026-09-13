const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const User = require('../models/User');
const { signCustomerToken, setCustomerCookie, clearCustomerCookie } = require('../middleware/customerAuth');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendMail } = require('../utils/email');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json({ success: false, message: 'Email and password are required.' });
  }
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }
  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  if (!user.isActive) return res.status(403).json({ success: false, message: 'Account is disabled.' });

  user.lastLogin = new Date();
  await user.save();

  const token = signCustomerToken(user);
  setCustomerCookie(res, token);

  res.json({
    success: true,
    message: 'Logged in successfully.',
    token,
    requiresPasswordChange: !!user.isTemporaryPassword,
    user: user.toSafeObject(),
  });
});

const logout = asyncHandler(async (req, res) => {
  clearCustomerCookie(res);
  res.json({ success: true, message: 'Logged out.' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(422).json({ success: false, message: 'Email is required.' });
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) {
    return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 3600 * 1000);
  await user.save();

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  sendMail({
    to: user.email,
    subject: 'Password reset — Miti Beauty',
    html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetLink}">Reset password</a></p>`,
    text: `Reset your password: ${resetLink}`,
  }).catch(() => {});

  res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(422).json({ success: false, message: 'Token and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(422).json({ success: false, message: 'New password must be at least 8 characters.' });
  }
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
  await user.hashPassword(newPassword);
  user.isTemporaryPassword = false;
  user.resetPasswordToken = '';
  user.resetPasswordExpires = undefined;
  await user.save();

  const newToken = signCustomerToken(user);
  setCustomerCookie(res, newToken);
  res.json({ success: true, message: 'Password reset successfully.', token: newToken, user: user.toSafeObject() });
});

module.exports = { login, logout, forgotPassword, resetPassword };
