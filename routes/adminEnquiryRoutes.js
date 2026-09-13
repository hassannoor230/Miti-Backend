const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { list, reply } = require('../controllers/adminEnquiryController');

const router = express.Router();
router.use(requireAdmin);
router.get('/', list);
router.post('/:id/reply', reply);

module.exports = router;
