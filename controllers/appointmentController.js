const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireCustomer, requireAny, requireRole } = require('../middleware/customerAuth');
const jsondb = require('../utils/jsondb');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { sendMail } = require('../utils/email');
const { createNotification } = require('./notificationController');

async function getSettings() {
  if (isMongoReady()) {
    const BusinessSettings = require('../models/BusinessSettings');
    return (await BusinessSettings.findOne().lean()) || {};
  }
  const jsondb = require('../utils/jsondb');
  return jsondb.getSettings() || {};
}

const create = asyncHandler(async (req, res) => {
  const { name, phone, email, service, date, time, message } = req.body;
  if (!name || !phone) {
    return res.status(422).json({ success: false, message: 'Name and phone are required.' });
  }
  const payload = {
    name: String(name).trim(),
    phone: String(phone).trim(),
    email: String(email || '').toLowerCase().trim(),
    service: String(service || '').trim(),
    date: String(date || ''),
    time: String(time || ''),
    message: String(message || ''),
    status: 'pending',
  };
  if (req.auth && req.auth.sub) {
    payload.customer = req.auth.sub;
  }
  let appointment;
  if (isMongoReady()) {
    appointment = await Appointment.create(payload);
  } else {
    appointment = jsondb.insert('appointments', payload);
  }
  await createNotification({
    customer: payload.customer,
    title: 'Appointment requested',
    message: `Request for ${payload.service || 'service'} on ${payload.date || 'TBD'} at ${payload.time || 'TBD'}.`,
    type: 'appointment',
    relatedAppointment: appointment._id,
  });
  if (payload.email) {
    sendMail({
      to: payload.email,
      subject: 'Appointment request received — Miti Beauty',
      html: `<p>Hi ${payload.name},</p><p>We have received your appointment request and will confirm shortly.</p><p><strong>Service:</strong> ${payload.service || '—'}<br><strong>Date:</strong> ${payload.date || '—'}<br><strong>Time:</strong> ${payload.time || '—'}</p>`,
      text: `Appointment request received for ${payload.service || 'service'}.`,
    }).catch(() => {});
  }
  res.status(201).json({ success: true, data: appointment, message: 'Appointment request received.' });
});

const mine = asyncHandler(async (req, res) => {
  const customer = req.auth.sub;
  if (isMongoReady()) {
    const items = await Appointment.find({ customer }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items });
  }
  const items = (jsondb.all('appointments') || []).filter((a) => String(a.customer) === String(customer));
  res.json({ success: true, data: items });
});

const getOne = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });
  if (String(appointment.customer) !== String(req.auth.sub)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  res.json({ success: true, data: appointment });
});

const requestReschedule = asyncHandler(async (req, res) => {
  const { requestedDate, requestedTime, reason } = req.body;
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });
  if (String(appointment.customer) !== String(req.auth.sub)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  if (!['pending', 'confirmed', 'rescheduled'].includes(appointment.status)) {
    return res.status(422).json({ success: false, message: 'Cannot reschedule this appointment.' });
  }
  appointment.rescheduleRequest = {
    status: 'pending',
    requestedDate: String(requestedDate || ''),
    requestedTime: String(requestedTime || ''),
    reason: String(reason || ''),
    requestedAt: new Date(),
  };
  await appointment.save();
  await createNotification({
    customer: appointment.customer,
    title: 'Reschedule request sent',
    message: `Request to move to ${requestedDate || 'TBD'} at ${requestedTime || 'TBD'}.`,
    type: 'reschedule',
    relatedAppointment: appointment._id,
  });
  res.json({ success: true, data: appointment });
});

const cancel = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });
  if (String(appointment.customer) !== String(req.auth.sub)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  appointment.status = 'cancelled';
  appointment.cancellationReason = String(reason || 'Customer cancellation');
  await appointment.save();
  await createNotification({
    customer: appointment.customer,
    title: 'Appointment cancelled',
    message: `Your appointment on ${appointment.date} at ${appointment.time} has been cancelled.`,
    type: 'cancel',
    relatedAppointment: appointment._id,
  });
  if (appointment.email) {
    sendMail({
      to: appointment.email,
      subject: 'Appointment cancelled — Miti Beauty',
      html: `<p>Hi ${appointment.name},</p><p>Your appointment on ${appointment.date} at ${appointment.time} has been cancelled.</p>`,
      text: 'Appointment cancelled.',
    }).catch(() => {});
  }
  res.json({ success: true, data: appointment });
});

module.exports = { create, mine, getOne, requestReschedule, cancel };
