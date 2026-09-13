const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    service: { type: String, default: '', trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['unread', 'read', 'replied', 'archived'], default: 'unread', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactMessageSchema);
