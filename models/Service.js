const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    longDescription: { type: String, default: '' },
    price: { type: String, default: '' },
    duration: { type: String, default: '' },
    image: { type: String, default: '' },
    category: { type: String, default: '', index: true },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Service || mongoose.model('Service', serviceSchema);
