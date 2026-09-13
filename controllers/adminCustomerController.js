const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireCustomer, requireAny, requireRole } = require('../middleware/customerAuth');
const jsondb = require('../utils/jsondb');
const User = require('../models/User');
const Enquiry = require('../models/Enquiry');
const Appointment = require('../models/Appointment');
const { sendMail } = require('../utils/email');
const { createNotification } = require('./notificationController');

const list = asyncHandler(async (req, res) => {
  const { search, role, limit = 100 } = req.query;
  if (isMongoReady()) {
    const filter = {};
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
      ];
    }
    if (role) filter.role = role;
    const items = await User.find(filter)
      .select('-passwordHash -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    const total = await User.countDocuments(filter);
    return res.json({ success: true, data: items, total });
  }
  const items = (jsondb.all('admins') || [])
    .map((u) => ({ ...u, passwordHash: undefined }))
    .filter((u) => !role || u.role === role);
  res.json({ success: true, data: items, total: items.length });
});

const getOne = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash -resetPasswordToken -resetPasswordExpires');
  if (!user) return res.status(404).json({ success: false, message: 'Customer not found.' });
  res.json({ success: true, data: user });
});

const appointments = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'Customer not found.' });
  if (isMongoReady()) {
    const items = await Appointment.find({ customer: req.params.id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items });
  }
  const items = (jsondb.all('appointments') || []).filter((a) => String(a.customer) === String(req.params.id));
  res.json({ success: true, data: items });
});

const enquiries = asyncHandler(async (req, res) => {
  if (isMongoReady()) {
    const items = await Enquiry.find({ customer: req.params.id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items });
  }
  const items = (jsondb.all('enquiries') || []).filter((e) => String(e.customer) === String(req.params.id));
  res.json({ success: true, data: items });
});

module.exports = { list, getOne, appointments, enquiries };
