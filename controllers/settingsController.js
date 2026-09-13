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

module.exports = { get, update };
