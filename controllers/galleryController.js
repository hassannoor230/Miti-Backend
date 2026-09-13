const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { makeFilename } = require('../middleware/upload');
const jsondb = require('../utils/jsondb');
const Gallery = require('../models/Gallery');

const list = asyncHandler(async (req, res) => {
  const { category, featured } = req.query;
  if (isMongoReady()) {
    const filter = {};
    if (category && category !== 'All') filter.category = category;
    if (featured === '1') filter.featured = true;
    const items = await Gallery.find(filter).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.json({ success: true, data: items });
  }
  let items = jsondb.all('gallery');
  if (category && category !== 'All') items = items.filter((g) => g.category === category);
  if (featured === '1') items = items.filter((g) => g.featured);
  items = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  res.json({ success: true, data: items });
});

const create = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (req.file) body.image = `/uploads/${makeFilename(req.file)}`;
  if (!body.image) return res.status(422).json({ success: false, message: 'An image is required.' });
  if (typeof body.featured === 'string') body.featured = body.featured === 'true';
  if (body.sortOrder !== undefined) body.sortOrder = Number(body.sortOrder) || 0;
  if (isMongoReady()) {
    const created = await Gallery.create(body);
    return res.status(201).json({ success: true, data: created });
  }
  const created = jsondb.insert('gallery', { category: 'Salon', featured: false, sortOrder: 0, ...body });
  res.status(201).json({ success: true, data: created });
});

const update = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (req.file) body.image = `/uploads/${makeFilename(req.file)}`;
  if (typeof body.featured === 'string') body.featured = body.featured === 'true';
  if (isMongoReady()) {
    const updated = await Gallery.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Gallery image not found.' });
    return res.json({ success: true, data: updated });
  }
  const updated = jsondb.update('gallery', req.params.id, body);
  if (!updated) return res.status(404).json({ success: false, message: 'Gallery image not found.' });
  res.json({ success: true, data: updated });
});

const remove = asyncHandler(async (req, res) => {
  if (isMongoReady()) {
    const deleted = await Gallery.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Gallery image not found.' });
    return res.json({ success: true, message: 'Gallery image deleted.' });
  }
  const ok = jsondb.remove('gallery', req.params.id);
  if (!ok) return res.status(404).json({ success: false, message: 'Gallery image not found.' });
  res.json({ success: true, message: 'Gallery image deleted.' });
});

module.exports = { list, create, update, remove };
