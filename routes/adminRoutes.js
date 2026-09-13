const express = require('express');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication.
router.use(requireAdmin);

router.get('/dashboard', require('../controllers/adminCustomerController').list);
router.get('/customers', require('../controllers/adminCustomerController').list);
router.get('/customers/:id', require('../controllers/adminCustomerController').getOne);
router.get('/customers/:id/appointments', require('../controllers/adminCustomerController').appointments);
router.get('/customers/:id/enquiries', require('../controllers/adminCustomerController').enquiries);

router.get('/appointments', require('../controllers/adminAppointmentController').list);
router.patch('/appointments/:id', require('../controllers/adminAppointmentController').update);

router.get('/enquiries', require('../controllers/adminEnquiryController').list);
router.post('/enquiries/:id/reply', require('../controllers/adminEnquiryController').reply);

module.exports = router;
