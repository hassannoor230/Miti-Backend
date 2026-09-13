const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const jsondb = require('../utils/jsondb');
const Review = require('../models/Review');

const list = asyncHandler(async (req, res) => {
  const includeAll = req.query.all === '1';
  if (isMongoReady()) {
    const filter = includeAll ? {} : { approved: true };
    const items = await Review.find(filter).sort({ featured: -1, createdAt: -1 }).lean();
    return res.json({ success: true, data: items });
  }
  let items = jsondb.all('reviews');
  if (!includeAll) items = items.filter((r) => r.approved !== false);
  items = [...items].sort((a, b) => Number(b.featured || 0) - Number(a.featured || 0));
  res.json({ success: true, data: items });
});

const create = asyncHandler(async (req, res) => {
  const { customerName, rating, reviewText, ownerResponse, source, reviewDate, featured, approved } = req.body;
  if (!customerName || !reviewText) {
    return res.status(422).json({ success: false, message: 'Name and review text are required.' });
  }
  const numRating = Math.min(5, Math.max(1, Number(rating) || 5));
  // Public submissions always start unapproved; admin-created ones can be approved directly.
  const isAdmin = !!req.admin;
  const payload = {
    customerName: String(customerName).trim(),
    rating: numRating,
    reviewText: String(reviewText),
    ownerResponse: isAdmin ? String(ownerResponse || '') : '',
    source: String(source || 'Website'),
    reviewDate: String(reviewDate || 'Just now'),
    featured: isAdmin ? !!featured : false,
    approved: isAdmin ? approved !== false : false,
  };
  if (isMongoReady()) {
    const created = await Review.create(payload);
    return res.status(201).json({ success: true, data: created });
  }
  const created = jsondb.insert('reviews', payload);
  res.status(201).json({ success: true, data: created });
});

const update = asyncHandler(async (req, res) => {
  if (isMongoReady()) {
    const updated = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Review not found.' });
    return res.json({ success: true, data: updated });
  }
  const updated = jsondb.update('reviews', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Review not found.' });
  res.json({ success: true, data: updated });
});

const remove = asyncHandler(async (req, res) => {
  if (isMongoReady()) {
    const deleted = await Review.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Review not found.' });
    return res.json({ success: true, message: 'Review deleted.' });
  }
  const ok = jsondb.remove('reviews', req.params.id);
  if (!ok) return res.status(404).json({ success: false, message: 'Review not found.' });
  res.json({ success: true, message: 'Review deleted.' });
});

module.exports = { list, create, update, remove };
