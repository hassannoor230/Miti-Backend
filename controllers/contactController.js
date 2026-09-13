const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendMail } = require('../utils/email');
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

  let created;
  if (isMongoReady()) {
    created = await ContactMessage.create(payload);
  } else {
    created = jsondb.insert('messages', payload);
  }

  // Fire-and-forget email notifications (never block the response).
  notifyEnquiry(created).catch(() => {});

  res.status(201).json({ success: true, data: created, message: 'Enquiry sent successfully.' });
});

async function getSettings() {
  if (isMongoReady()) {
    const BusinessSettings = require('../models/BusinessSettings');
    return (await BusinessSettings.findOne().lean()) || {};
  }
  const jsondb = require('../utils/jsondb');
  return jsondb.getSettings() || {};
}

async function notifyEnquiry(msg) {
  const s = await getSettings();
  const salonName = s.businessName || 'Miti Beauty';

  // 1) Auto-acknowledgement to the sender
  await sendMail({
    to: msg.email,
    subject: `Thanks for your message — ${salonName}`,
    html: `
      <p>Hi <strong>${msg.name}</strong>,</p>
      <p>Thank you for contacting <strong>${salonName}</strong>. We have received your message and will get back to you shortly.</p>
      ${msg.service ? `<p><strong>Service of interest:</strong> ${msg.service}</p>` : ''}
      <p><strong>Message:</strong></p>
      <blockquote style="margin:0.5em 0; padding-left:1em; border-left:3px solid #ccc; color:#444;">${msg.message}</blockquote>
      <p>In the meantime, you can reach us by phone on ${s.phone || 'our published number'} or via WhatsApp.</p>
      <p>Warmly,<br>${salonName} team</p>
    `,
    text: `Hi ${msg.name},\n\nThank you for contacting ${salonName}. We have received your message and will get back to you shortly.\n\n${msg.service ? 'Service of interest: ' + msg.service + '\n\n' : ''}Message:\n${msg.message}\n\nIn the meantime, you can reach us by phone on ${s.phone || 'our published number'} or via WhatsApp.\n\nWarmly,\n${salonName} team`,
  });

  // 2) Notification to the salon owner
  const ownerEmail = process.env.OWNER_EMAIL || s.email;
  if (ownerEmail) {
    await sendMail({
      to: ownerEmail,
      subject: `New enquiry from ${msg.name}`,
      html: `
        <p>New enquiry received at <strong>${salonName}</strong>:</p>
        <ul>
          <li><strong>Name:</strong> ${msg.name}</li>
          <li><strong>Email:</strong> ${msg.email}</li>
          <li><strong>Phone:</strong> ${msg.phone || '—'}</li>
          <li><strong>Service:</strong> ${msg.service || '—'}</li>
        </ul>
        <p><strong>Message:</strong></p>
        <blockquote style="margin:0.5em 0; padding-left:1em; border-left:3px solid #ccc; color:#444;">${msg.message}</blockquote>
        <p>View in admin: ${process.env.CLIENT_URL || ''}/admin/messages</p>
      `,
      text: `New enquiry at ${salonName}:\n\nName: ${msg.name}\nEmail: ${msg.email}\nPhone: ${msg.phone || '—'}\nService: ${msg.service || '—'}\n\nMessage:\n${msg.message}`,
    });
  }
}

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
