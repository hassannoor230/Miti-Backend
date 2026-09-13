const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { type: String, default: 'Salon', index: true },
    altText: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Gallery || mongoose.model('Gallery', gallerySchema);
