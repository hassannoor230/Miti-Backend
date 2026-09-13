const express = require('express');
const { requireCustomer, requireAny } = require('../middleware/customerAuth');

const router = express.Router();

// Profile
router.get('/profile', requireAny, require('../controllers/customerController').me);
router.put('/profile', requireAny, require('../controllers/customerController').updateProfile);
router.post('/change-password', requireAny, require('../controllers/customerController').changePassword);

// Enquiries
router.post('/', require('../controllers/enquiryController').create);
router.get('/enquiries', requireCustomer, require('../controllers/enquiryController').mine);
router.post('/enquiries/:id/replies', requireCustomer, require('../controllers/enquiryController').addReply);

// Appointments
router.post('/appointments', requireAny, require('../controllers/appointmentController').create);
router.get('/appointments', requireCustomer, require('../controllers/appointmentController').mine);
router.get('/appointments/:id', requireCustomer, require('../controllers/appointmentController').getOne);
router.post('/appointments/:id/reschedule-request', requireCustomer, require('../controllers/appointmentController').requestReschedule);
router.post('/appointments/:id/cancel', requireCustomer, require('../controllers/appointmentController').cancel);

// Notifications
router.get('/notifications', requireCustomer, require('../controllers/notificationController').list);
router.patch('/notifications/:id/read', requireCustomer, require('../controllers/notificationController').readOne);
router.patch('/notifications/read-all', requireCustomer, require('../controllers/notificationController').readAll);

module.exports = router;
