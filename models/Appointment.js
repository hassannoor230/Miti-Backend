const mongoose = require('mongoose');

const historyEntrySchema = new mongoose.Schema(
  {
    oldDate: { type: String, default: '' },
    oldTime: { type: String, default: '' },
    newDate: { type: String, default: '' },
    newTime: { type: String, default: '' },
    changedBy: { type: String, enum: ['customer', 'admin'], default: 'admin' },
    reason: { type: String, default: '' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    service: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'rejected'],
      default: 'pending',
      index: true,
    },
    notes: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
    cancellationReason: { type: String, default: '' },
    rescheduleReason: { type: String, default: '' },
    rescheduleRequest: {
      status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
      requestedDate: { type: String, default: '' },
      requestedTime: { type: String, default: '' },
      reason: { type: String, default: '' },
      requestedAt: { type: Date },
    },
    appointmentHistory: [historyEntrySchema],
  },
  { timestamps: true }
);

appointmentSchema.index({ email: 1, createdAt: -1 });
appointmentSchema.index({ status: 1, date: 1 });

module.exports = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);