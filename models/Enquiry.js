const mongoose = require('mongoose');

const replySchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['customer', 'admin'], required: true },
    senderName: { type: String, default: '' },
    message: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const enquirySchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, default: '', trim: true },
    subject: { type: String, default: '', trim: true },
    service: { type: String, default: '', trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['pending', 'replied', 'closed'], default: 'pending', index: true },
    replies: [replySchema],
  },
  { timestamps: true }
);

enquirySchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.models.Enquiry || mongoose.model('Enquiry', enquirySchema);