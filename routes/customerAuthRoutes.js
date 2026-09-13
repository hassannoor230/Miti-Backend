const express = require('express');
const { body } = require('express-validator');
const { login, logout, forgotPassword, resetPassword } = require('../controllers/customerAuthController');
const { requireCustomer, requireAny } = require('../middleware/customerAuth');
const { me, updateProfile, changePassword } = require('../controllers/customerController');
const { handleValidation } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('A valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
], handleValidation, login);
router.post('/logout', logout);
router.post('/forgot-password', authLimiter, [
  body('email').isEmail().withMessage('A valid email is required.'),
], handleValidation, forgotPassword);
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token is required.'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
], handleValidation, resetPassword);

router.get('/me', requireAny, me);
router.put('/profile', requireAny, updateProfile);
router.post('/change-password', requireAny, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], handleValidation, changePassword);

module.exports = router;
