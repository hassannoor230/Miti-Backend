const express = require('express');
const { get, update } = require('../controllers/settingsController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', get);
router.put('/', requireAdmin, update);

module.exports = router;
