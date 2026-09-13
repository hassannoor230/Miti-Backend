const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const jsondb = require('../utils/jsondb');
const ContactMessage = require('../models/ContactMessage');

const VALID_STATUSES = ['unread', 'read', 'replied', 'archived'];

const list = asyncHandler(async (req, res) => {
  if (isMongoReady()) {
    const items = await ContactMessage.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items });
  }
  const items = [...jsondb.all('messages')].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, data: items });
});

const create = asyncHandler(async (req, res) => {
  const { name, email, phone, service, message } = req.body;
  if (!name || !email || !message) {
    return res.status(422).json({ success: false, message: 'Name, email and message are required.' });
  }
  const payload = {
    name: String(name).trim(),
    email: String(email).trim(),
    phone: String(phone || '').trim(),
    service: String(service || '').trim(),
    message: String(message),
    status: 'unread',
  };
  if (isMongoReady()) {
    const created = await ContactMessage.create(payload);
    return res.status(201).json({ success: true, data: created, message: 'Enquiry sent successfully.' });
  }
  const created = jsondb.insert('messages', payload);
  res.status(201).json({ success: true, data: created, message: 'Enquiry sent successfully.' });
});

const update = asyncHandler(async (req, res) => {
  const allowed = {};
  if (req.body.status && VALID_STATUSES.includes(req.body.status)) allowed.status = req.body.status;
  if (isMongoReady()) {
    const updated = await ContactMessage.findByIdAndUpdate(req.params.id, allowed, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Message not found.' });
    return res.json({ success: true, data: updated });
  }
  const updated = jsondb.update('messages', req.params.id, allowed);
  if (!updated) return res.status(404).json({ success: false, message: 'Message not found.' });
  res.json({ success: true, data: updated });
});

const remove = asyncHandler(async (req, res) => {
  if (isMongoReady()) {
    const deleted = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Message not found.' });
    return res.json({ success: true, message: 'Message deleted.' });
  }
  const ok = jsondb.remove('messages', req.params.id);
  if (!ok) return res.status(404).json({ success: false, message: 'Message not found.' });
  res.json({ success: true, message: 'Message deleted.' });
});

module.exports = { list, create, update, remove };
