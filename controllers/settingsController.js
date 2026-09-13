const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const jsondb = require('../utils/jsondb');
const BusinessSettings = require('../models/BusinessSettings');
const seedData = require('../utils/seed-data');

const get = asyncHandler(async (req, res) => {
  if (isMongoReady()) {
    let doc = await BusinessSettings.findOne().lean();
    if (!doc) doc = (await BusinessSettings.create({ ...seedData.settings })).toObject();
    return res.json({ success: true, data: doc });
  }
  const doc = jsondb.getSettings();
  res.json({ success: true, data: doc });
});

const update = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  delete body._id;
  delete body.createdAt;
  if (isMongoReady()) {
    let doc = await BusinessSettings.findOne();
    if (!doc) doc = await BusinessSettings.create({ ...seedData.settings, ...body });
    else {
      Object.assign(doc, body);
      await doc.save();
    }
    return res.json({ success: true, data: doc });
  }
  const doc = jsondb.saveSettings(body);
  res.json({ success: true, data: doc });
});

/** SMTP status — admin only. Never returns secrets, only booleans. */
const smtpStatus = asyncHandler(async (req, res) => {
  const configured = Boolean(
    (process.env.SMTP_HOST || '').trim() &&
    (process.env.SMTP_USER || '').trim() &&
    (process.env.SMTP_PASS || '').trim()
  );
  res.json({
    success: true,
    data: {
      configured,
      host: process.env.SMTP_HOST || '',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
      from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
      ownerEmail: process.env.OWNER_EMAIL || '',
    },
  });
});

module.exports = { get, update, smtpStatus };
