const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendMail } = require('../utils/email');
const jsondb = require('../utils/jsondb');
const Booking = require('../models/Booking');

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

const list = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
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
    const items = await Booking.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items });
  }
  let items = jsondb.all('bookings');
  if (status && status !== 'all') items = items.filter((b) => b.status === status);
  if (search) {
    const q = String(search).toLowerCase();
    items = items.filter((b) =>
      [b.name, b.phone, b.email, b.service].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }
  items = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, data: items });
});

const getOne = asyncHandler(async (req, res) => {
  const item = isMongoReady() ? await Booking.findById(req.params.id).lean() : jsondb.find('bookings', req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Booking not found.' });
  res.json({ success: true, data: item });
});

const create = asyncHandler(async (req, res) => {
  const { name, phone, email, service, preferredDate, preferredTime, message } = req.body;
  if (!name || !phone) {
    return res.status(422).json({ success: false, message: 'Your name and phone number are required.' });
  }
  const payload = {
    name: String(name).trim(),
    phone: String(phone).trim(),
    email: String(email || '').trim(),
    service: String(service || '').trim(),
    preferredDate: String(preferredDate || ''),
    preferredTime: String(preferredTime || ''),
    message: String(message || ''),
    status: 'pending',
    read: false,
  };

  let created;
  if (isMongoReady()) {
    created = await Booking.create(payload);
  } else {
    created = jsondb.insert('bookings', payload);
  }

  // Fire-and-forget email notifications (never block the response).
  notifyBooking(created).catch(() => {});

  res.status(201).json({ success: true, data: created, message: 'Appointment request received.' });
});

async function getSettings() {
  if (isMongoReady()) {
    const BusinessSettings = require('../models/BusinessSettings');
    return (await BusinessSettings.findOne().lean()) || {};
  }
  const jsondb = require('../utils/jsondb');
  return jsondb.getSettings() || {};
}

async function notifyBooking(booking) {
  const s = await getSettings();
  const salonName = s.businessName || 'Miti Beauty';
  const dateStr = booking.preferredDate || 'your preferred date';
  const timeStr = booking.preferredTime || 'your preferred time';

  // 1) Confirmation to the customer
  if (booking.email) {
    await sendMail({
      to: booking.email,
      subject: `Appointment request received — ${salonName}`,
      html: `
        <p>Hi <strong>${booking.name}</strong>,</p>
        <p>Thank you for your appointment request at <strong>${salonName}</strong>. We have received it and will confirm shortly.</p>
        <p><strong>Service:</strong> ${booking.service || '—'}<br>
        <strong>Date:</strong> ${dateStr}<br>
        <strong>Time:</strong> ${timeStr}</p>
        <p>If you need to change anything, just reply to this email or call us on ${s.phone || 'our published number'}.</p>
        <p>Warmly,<br>${salonName} team</p>
      `,
      text: `Hi ${booking.name},\n\nThank you for your appointment request at ${salonName}. We have received it and will confirm shortly.\n\nService: ${booking.service || '—'}\nDate: ${dateStr}\nTime: ${timeStr}\n\nIf you need to change anything, just reply to this email or call us on ${s.phone || 'our published number'}.\n\nWarmly,\n${salonName} team`,
    });
  }

  // 2) Notification to the salon owner
  const ownerEmail = process.env.OWNER_EMAIL || s.email;
  if (ownerEmail) {
    await sendMail({
      to: ownerEmail,
      subject: `New appointment request — ${booking.name}`,
      html: `
        <p>New appointment request received at <strong>${salonName}</strong>:</p>
        <ul>
          <li><strong>Name:</strong> ${booking.name}</li>
          <li><strong>Phone:</strong> ${booking.phone}</li>
          <li><strong>Email:</strong> ${booking.email || '—'}</li>
          <li><strong>Service:</strong> ${booking.service || '—'}</li>
          <li><strong>Date:</strong> ${dateStr}</li>
          <li><strong>Time:</strong> ${timeStr}</li>
        </ul>
        ${booking.message ? `<p><strong>Message:</strong> ${booking.message}</p>` : ''}
        <p>View in admin: ${process.env.CLIENT_URL || ''}/admin/bookings</p>
      `,
      text: `New appointment request at ${salonName}:\n\nName: ${booking.name}\nPhone: ${booking.phone}\nEmail: ${booking.email || '—'}\nService: ${booking.service || '—'}\nDate: ${dateStr}\nTime: ${timeStr}\n\n${booking.message ? 'Message: ' + booking.message : ''}`,
    });
  }
}

const update = asyncHandler(async (req, res) => {
  const allowed = {};
  if (req.body.status && VALID_STATUSES.includes(req.body.status)) allowed.status = req.body.status;
  if (req.body.adminNotes !== undefined) allowed.adminNotes = String(req.body.adminNotes);
  if (req.body.read !== undefined) allowed.read = !!req.body.read;
  if (isMongoReady()) {
    const updated = await Booking.findByIdAndUpdate(req.params.id, allowed, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Booking not found.' });
    return res.json({ success: true, data: updated });
  }
  const updated = jsondb.update('bookings', req.params.id, allowed);
  if (!updated) return res.status(404).json({ success: false, message: 'Booking not found.' });
  res.json({ success: true, data: updated });
});

const stats = asyncHandler(async (req, res) => {
  if (isMongoReady()) {
    const ContactMessage = require('../models/ContactMessage');
    const Service = require('../models/Service');
    const Review = require('../models/Review');
    const Gallery = require('../models/Gallery');
    const [totalBookings, pendingBookings, unreadMessages, totalServices, totalReviews, galleryImages, recentBookings, recentMessages] =
      await Promise.all([
        Booking.countDocuments(),
        Booking.countDocuments({ status: 'pending' }),
        ContactMessage.countDocuments({ status: 'unread' }),
        Service.countDocuments(),
        Review.countDocuments(),
        Gallery.countDocuments(),
        Booking.find().sort({ createdAt: -1 }).limit(5).lean(),
        ContactMessage.find().sort({ createdAt: -1 }).limit(5).lean(),
      ]);
    return res.json({
      success: true,
      data: { totalBookings, pendingBookings, unreadMessages, totalServices, totalReviews, galleryImages, recentBookings, recentMessages },
    });
  }
  const bookings = jsondb.all('bookings');
  const messages = jsondb.all('messages');
  const data = {
    totalBookings: bookings.length,
    pendingBookings: bookings.filter((b) => b.status === 'pending').length,
    unreadMessages: messages.filter((m) => m.status === 'unread').length,
    totalServices: jsondb.all('services').length,
    totalReviews: jsondb.all('reviews').length,
    galleryImages: jsondb.all('gallery').length,
    recentBookings: [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    recentMessages: [...messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
  };
  res.json({ success: true, data });
});

module.exports = { list, getOne, create, update, stats };
