const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const jsondb = require('../utils/jsondb');
const Notification = require('../models/Notification');

async function createNotification({ customer, title, message, type, relatedAppointment, relatedEnquiry }) {
  if (isMongoReady() && customer) {
    try {
      await Notification.create({
        customer,
        title,
        message,
        type,
        relatedAppointment: relatedAppointment || null,
        relatedEnquiry: relatedEnquiry || null,
      });
    } catch (e) {
      console.warn('[notify] create failed:', e.message);
    }
  }
}

const list = asyncHandler(async (req, res) => {
  const customer = req.auth && req.auth.sub;
  if (isMongoReady()) {
    const items = await Notification.find({ customer }).sort({ createdAt: -1 }).limit(100).lean();
    const unread = items.filter((n) => !n.isRead).length;
    return res.json({ success: true, data: items, unreadCount: unread });
  }
  const items = (jsondb.all('notifications') || []).filter((n) => String(n.customer) === String(customer));
  const unread = items.filter((n) => !n.isRead).length;
  res.json({ success: true, data: items, unreadCount: unread });
});

const readOne = asyncHandler(async (req, res) => {
  const customer = req.auth && req.auth.sub;
  if (isMongoReady()) {
    await Notification.updateOne({ _id: req.params.id, customer }, { isRead: true });
    return res.json({ success: true });
  }
  jsondb.update('notifications', req.params.id, { isRead: true });
  res.json({ success: true });
});

const readAll = asyncHandler(async (req, res) => {
  const customer = req.auth && req.auth.sub;
  if (isMongoReady()) {
    await Notification.updateMany({ customer, isRead: false }, { isRead: true });
    return res.json({ success: true });
  }
  const items = (jsondb.all('notifications') || []).filter((n) => String(n.customer) === String(customer));
  items.forEach((n) => jsondb.update('notifications', n._id, { isRead: true }));
  res.json({ success: true });
});

module.exports = { createNotification, list, readOne, readAll };