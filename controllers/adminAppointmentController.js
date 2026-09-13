const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const jsondb = require('../utils/jsondb');
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

async function notifyCustomer(appointment, title, message, type) {
  if (appointment.customer) {
    await createNotification({
      customer: appointment.customer,
      title,
      message,
      type,
      relatedAppointment: appointment._id,
    });
  }
  if (appointment.email) {
    sendMail({
      to: appointment.email,
      subject: `${title} — Miti Beauty`,
      html: `<p>Hi ${appointment.name},</p><p>${message}</p>`,
      text: message,
    }).catch(() => {});
  }
}

const list = asyncHandler(async (req, res) => {
  const { status, search, date } = req.query;
  if (isMongoReady()) {
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { service: new RegExp(search, 'i') },
      ];
    }
    if (date) filter.date = date;
    const items = await Appointment.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items });
  }
  let items = jsondb.all('appointments') || [];
  if (status && status !== 'all') items = items.filter((a) => a.status === status);
  if (search) {
    const q = String(search).toLowerCase();
    items = items.filter((a) => [a.name, a.phone, a.email, a.service].some((v) => String(v || '').toLowerCase().includes(q)));
  }
  res.json({ success: true, data: items });
});

const update = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });
  const { status, adminNotes, cancellationReason, rescheduleReason, newDate, newTime, approveReschedule } = req.body;

  if (status && status !== appointment.status) {
    appointment.status = status;
    let msg = `Your appointment status is now ${status}.`;
    if (status === 'confirmed') msg = `Your appointment on ${appointment.date} at ${appointment.time} has been CONFIRMED.`;
    else if (status === 'rejected') msg = `Your appointment on ${appointment.date} at ${appointment.time} has been REJECTED.`;
    else if (status === 'completed') msg = `Your appointment on ${appointment.date} at ${appointment.time} has been COMPLETED.`;
    else if (status === 'cancelled') msg = `Your appointment on ${appointment.date} at ${appointment.time} has been CANCELLED.`;
    await notifyCustomer(appointment, `Appointment ${status}`, msg, status === 'rejected' ? 'cancel' : status);
  }

  if (status === 'rescheduled' && newDate && newTime) {
    appointment.appointmentHistory.push({
      oldDate: appointment.date,
      oldTime: appointment.time,
      newDate,
      newTime,
      changedBy: 'admin',
      reason: rescheduleReason || 'Admin rescheduled',
      changedAt: new Date(),
    });
    appointment.date = newDate;
    appointment.time = newTime;
    appointment.rescheduleReason = rescheduleReason || '';
    await notifyCustomer(appointment, 'Appointment rescheduled', `Your appointment has been moved to ${newDate} at ${newTime}.`, 'reschedule');
  }

  if (approveReschedule && appointment.rescheduleRequest && appointment.rescheduleRequest.status === 'pending') {
    const req2 = appointment.rescheduleRequest;
    appointment.appointmentHistory.push({
      oldDate: appointment.date,
      oldTime: appointment.time,
      newDate: req2.requestedDate,
      newTime: req2.requestedTime,
      changedBy: 'admin',
      reason: req2.reason || 'Admin approved reschedule request',
      changedAt: new Date(),
    });
    appointment.date = req2.requestedDate;
    appointment.time = req2.requestedTime;
    appointment.rescheduleRequest.status = 'approved';
    appointment.rescheduleReason = req2.reason || '';
    appointment.status = 'rescheduled';
    await notifyCustomer(appointment, 'Appointment rescheduled', `Your appointment has been moved to ${req2.requestedDate} at ${req2.requestedTime}.`, 'reschedule');
  }

  if (adminNotes !== undefined) appointment.adminNotes = String(adminNotes || '');
  if (cancellationReason !== undefined) appointment.cancellationReason = String(cancellationReason || '');
  if (rescheduleReason !== undefined && status !== 'rescheduled') appointment.rescheduleReason = String(rescheduleReason || '');

  await appointment.save();
  res.json({ success: true, data: appointment });
});

module.exports = { list, update };
