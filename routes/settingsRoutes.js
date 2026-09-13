const express = require('express');
const { get, update, smtpStatus } = require('../controllers/settingsController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', get);
router.put('/', requireAdmin, update);
router.get('/smtp', requireAdmin, smtpStatus);

module.exports = router;
