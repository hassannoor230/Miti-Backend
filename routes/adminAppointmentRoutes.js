const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { list, update } = require('../controllers/adminAppointmentController');

const router = express.Router();
router.use(requireAdmin);
router.get('/', list);
router.patch('/:id', update);

module.exports = router;
