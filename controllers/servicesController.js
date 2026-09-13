const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const jsondb = require('../utils/jsondb');
const Service = require('../models/Service');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function sortServices(list) {
  return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

const list = asyncHandler(async (req, res) => {
  const includeInactive = req.query.all === '1';
  if (isMongoReady()) {
    const filter = includeInactive ? {} : { active: true };
    const items = await Service.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean();
    return res.json({ success: true, data: items });
  }
  let items = jsondb.all('services');
  if (!includeInactive) items = items.filter((s) => s.active !== false);
  res.json({ success: true, data: sortServices(items) });
});

const getOne = asyncHandler(async (req, res) => {
  const key = req.params.id;
  let item = null;
  if (isMongoReady()) {
    item = await Service.findOne({ $or: [{ slug: key }, { _id: key.match(/^[a-f0-9]{24}$/i) ? key : null }] }).lean();
  } else {
    item = jsondb.findOne('services', (s) => s.slug === key || String(s._id) === String(key));
  }
  if (!item) return res.status(404).json({ success: false, message: 'Service not found.' });
  res.json({ success: true, data: item });
});

const create = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (!body.slug && body.name) body.slug = slugify(body.name);
  body.slug = slugify(body.slug);
  if (!body.name || !body.slug) {
    return res.status(422).json({ success: false, message: 'Service name is required.' });
  }
  if (req.file) body.image = `/uploads/${req.file.filename}`;
  if (isMongoReady()) {
    const exists = await Service.findOne({ slug: body.slug });
    if (exists) return res.status(409).json({ success: false, message: 'A service with this slug already exists.' });
    const created = await Service.create(body);
    return res.status(201).json({ success: true, data: created });
  }
  const exists = jsondb.findOne('services', (s) => s.slug === body.slug);
  if (exists) return res.status(409).json({ success: false, message: 'A service with this slug already exists.' });
  const created = jsondb.insert('services', { featured: false, active: true, sortOrder: 0, ...body });
  res.status(201).json({ success: true, data: created });
});

const update = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.slug) body.slug = slugify(body.slug);
  if (req.file) body.image = `/uploads/${req.file.filename}`;
  if (isMongoReady()) {
    const updated = await Service.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Service not found.' });
    return res.json({ success: true, data: updated });
  }
  const updated = jsondb.update('services', req.params.id, body);
  if (!updated) return res.status(404).json({ success: false, message: 'Service not found.' });
  res.json({ success: true, data: updated });
});

const remove = asyncHandler(async (req, res) => {
  if (isMongoReady()) {
    const deleted = await Service.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Service not found.' });
    return res.json({ success: true, message: 'Service deleted.' });
  }
  const ok = jsondb.remove('services', req.params.id);
  if (!ok) return res.status(404).json({ success: false, message: 'Service not found.' });
  res.json({ success: true, message: 'Service deleted.' });
});

module.exports = { list, getOne, create, update, remove };
