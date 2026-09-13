const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { list, getOne, appointments, enquiries } = require('../controllers/adminCustomerController');

const router = express.Router();
router.use(requireAdmin);
router.get('/', list);
router.get('/:id', getOne);
router.get('/:id/appointments', appointments);
router.get('/:id/enquiries', enquiries);

module.exports = router;
