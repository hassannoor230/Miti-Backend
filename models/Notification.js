const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'account',
        'enquiry',
        'appointment',
        'reschedule',
        'cancel',
        'reply',
        'system',
        'password',
      ],
      default: 'system',
      index: true,
    },
    isRead: { type: Boolean, default: false, index: true },
    relatedAppointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    relatedEnquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry', default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ customer: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);