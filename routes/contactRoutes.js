const express = require('express');
const { body } = require('express-validator');
const { list, create, update, remove } = require('../controllers/contactController');
const { requireAdmin } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { formLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/', requireAdmin, list);
router.post(
  '/',
  formLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 100 }),
    body('email').trim().isEmail().withMessage('A valid email is required.'),
    body('message').trim().notEmpty().withMessage('Message is required.').isLength({ max: 2000 }),
  ],
  handleValidation,
  create
);
router.put('/:id', requireAdmin, update);
router.delete('/:id', requireAdmin, remove);

module.exports = router;
