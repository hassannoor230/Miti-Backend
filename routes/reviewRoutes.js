const express = require('express');
const { list, create, update, remove } = require('../controllers/reviewsController');
const { requireAdmin } = require('../middleware/auth');
const { formLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/', list);
router.post('/', formLimiter, create);
router.put('/:id', requireAdmin, update);
router.delete('/:id', requireAdmin, remove);

module.exports = router;
