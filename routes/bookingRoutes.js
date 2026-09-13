const express = require('express');
const { body } = require('express-validator');
const { list, getOne, create, update, stats } = require('../controllers/bookingsController');
const { requireAdmin } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { formLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/stats', requireAdmin, stats);
router.get('/', requireAdmin, list);
router.get('/:id', requireAdmin, getOne);
router.post(
  '/',
  formLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 100 }),
    body('phone').trim().notEmpty().withMessage('Phone is required.').isLength({ max: 30 }),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Please enter a valid email.'),
  ],
  handleValidation,
  create
);
router.put('/:id', requireAdmin, update);

module.exports = router;
