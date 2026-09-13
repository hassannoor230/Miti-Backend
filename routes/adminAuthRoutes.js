const express = require('express');
const { body } = require('express-validator');
const { login, logout, me } = require('../controllers/adminAuthController');
const { requireAdmin } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().withMessage('A valid email is required.'), body('password').notEmpty().withMessage('Password is required.')],
  handleValidation,
  login
);
router.post('/logout', logout);
router.get('/me', requireAdmin, me);

module.exports = router;
