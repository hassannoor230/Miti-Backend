const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const jsondb = require('../utils/jsondb');
const Enquiry = require('../models/Enquiry');
const { sendMail } = require('../utils/email');
const { createNotification } = require('./notificationController');

const list = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  if (isMongoReady()) {
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
        { message: new RegExp(search, 'i') },
      ];
    }
    const items = await Enquiry.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items });
  }
  let items = jsondb.all('enquiries') || [];
  if (status && status !== 'all') items = items.filter((e) => e.status === status);
  if (search) {
    const q = String(search).toLowerCase();
    items = items.filter((e) => [e.name, e.email, e.subject, e.message].some((v) => String(v || '').toLowerCase().includes(q)));
  }
  res.json({ success: true, data: items });
});

const reply = asyncHandler(async (req, res) => {
  const { message, status } = req.body;
  if (!message) return res.status(422).json({ success: false, message: 'Message is required.' });
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found.' });
  enquiry.replies.push({ sender: 'admin', senderName: req.admin.email, message: String(message).trim() });
  enquiry.status = status || 'replied';
  await enquiry.save();

  if (enquiry.customer) {
    await createNotification({
      customer: enquiry.customer,
      title: 'Enquiry replied',
      message: String(message).trim(),
      type: 'reply',
      relatedEnquiry: enquiry._id,
    });
  }
  sendMail({
    to: enquiry.email,
    subject: `Re: ${enquiry.subject || 'Your enquiry'} — Miti Beauty`,
    html: `<p>Hi ${enquiry.name},</p><p>${String(message).trim()}</p><p>Warmly,<br>Miti Beauty team</p>`,
    text: String(message).trim(),
  }).catch(() => {});

  res.json({ success: true, data: enquiry });
});

module.exports = { list, reply };
