const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Salon Owner' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'admin' },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
