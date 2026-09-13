const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireCustomer, requireAny, requireRole } = require('../middleware/customerAuth');
const jsondb = require('../utils/jsondb');
const User = require('../models/User');
const Enquiry = require('../models/Enquiry');
const { sendMail } = require('../utils/email');
const { createNotification } = require('./notificationController');

async function findOrCreateCustomer({ name, email, phone }) {
  const normalized = String(email).toLowerCase().trim();
  let user = await User.findOne({ email: normalized });
  let isNew = false;
  if (!user) {
    const { generateTempPassword } = require('../utils/password');
    const temp = generateTempPassword();
    user = new User({
      name: String(name).trim(),
      email: normalized,
      phone: String(phone || '').trim(),
      role: 'customer',
      isTemporaryPassword: true,
    });
    await user.hashPassword(temp);
    await user.save();
    isNew = true;
    return { user, tempPassword: temp, isNew: true };
  }
  return { user, isNew: false };
}

const create = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, service, message } = req.body;
  if (!name || !email || !message) {
    return res.status(422).json({ success: false, message: 'Name, email and message are required.' });
  }
  const normalized = String(email).toLowerCase().trim();
  const { user, tempPassword, isNew } = await findOrCreateCustomer({ name, email, phone });

  let enquiry;
  if (isMongoReady()) {
    enquiry = await Enquiry.create({
      customer: user._id,
      name: String(name).trim(),
      email: normalized,
      phone: String(phone || '').trim(),
      subject: String(subject || '').trim(),
      service: String(service || '').trim(),
      message: String(message),
      status: 'pending',
    });
  } else {
    enquiry = jsondb.insert('enquiries', {
      customer: user._id,
      name: String(name).trim(),
      email: normalized,
      phone: String(phone || '').trim(),
      subject: String(subject || '').trim(),
      service: String(service || '').trim(),
      message: String(message),
      status: 'pending',
    });
  }

  await createNotification({
    customer: user._id,
    title: isNew ? 'Account created' : 'Enquiry received',
    message: isNew
      ? `Your Miti Beauty account has been created. Temporary password: ${tempPassword}`
      : 'We have received your enquiry and will get back to you soon.',
    type: isNew ? 'account' : 'enquiry',
    relatedEnquiry: enquiry._id,
  });

  if (isNew) {
    sendMail({
      to: normalized,
      subject: 'Your Miti Beauty account — temporary login details',
      html: `<p>Hi ${user.name},</p><p>Your account has been created using <strong>${normalized}</strong>.</p><p><strong>Temporary password:</strong> <code>${tempPassword}</code></p><p>Please log in and set a new password at your first login.</p>`,
      text: `Account created for ${normalized}. Temporary password: ${tempPassword}`,
    }).catch(() => {});
  } else {
    sendMail({
      to: normalized,
      subject: 'Enquiry received — Miti Beauty',
      html: `<p>Hi ${user.name},</p><p>We have received your enquiry and will get back to you soon.</p>`,
      text: 'Enquiry received.',
    }).catch(() => {});
  }

  res.status(201).json({
    success: true,
    data: enquiry,
    accountCreated: isNew,
    message: isNew ? 'Account created. Check your email for temporary login details.' : 'Enquiry sent successfully.',
  });
});

const mine = asyncHandler(async (req, res) => {
  const customer = req.auth.sub;
  if (isMongoReady()) {
    const items = await Enquiry.find({ $or: [{ customer }, { email: req.auth.email }] })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: items });
  }
  const items = (jsondb.all('enquiries') || []).filter(
    (e) => String(e.customer) === String(customer) || String(e.email).toLowerCase() === String(req.auth.email).toLowerCase()
  );
  res.json({ success: true, data: items });
});

const addReply = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(422).json({ success: false, message: 'Message is required.' });
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found.' });
  if (String(enquiry.customer) !== String(req.auth.sub) && enquiry.email.toLowerCase() !== req.auth.email.toLowerCase()) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  enquiry.replies.push({ sender: 'customer', senderName: req.auth.email, message: String(message).trim() });
  enquiry.status = 'replied';
  await enquiry.save();
  await createNotification({
    customer: enquiry.customer,
    title: 'New message from customer',
    message: String(message).trim(),
    type: 'reply',
    relatedEnquiry: enquiry._id,
  });
  res.json({ success: true, data: enquiry });
});

module.exports = { create, mine, addReply };
