const mongoose = require('mongoose');

const openingHourSchema = new mongoose.Schema(
  { day: { type: String, required: true }, hours: { type: String, default: '' } },
  { _id: false }
);

const businessSettingsSchema = new mongoose.Schema(
  {
    businessName: { type: String, default: 'Miti Beauty' },
    category: { type: String, default: 'Beauty Salon' },
    phone: { type: String, default: '' },
    phoneIntl: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    email: { type: String, default: '' },
    addressStreet: { type: String, default: '' },
    addressArea: { type: String, default: '' },
    addressCity: { type: String, default: '' },
    postcode: { type: String, default: '' },
    country: { type: String, default: '' },
    fullAddress: { type: String, default: '' },
    plusCode: { type: String, default: '' },
    instagram: { type: String, default: '' },
    instagramUrl: { type: String, default: '' },
    googleMapsUrl: { type: String, default: '' },
    googleRating: { type: Number, default: 4.9 },
    googleReviewCount: { type: Number, default: 61 },
    statusNote: { type: String, default: '' },
    ownerMessage: { type: String, default: '' },
    openingHours: { type: [openingHourSchema], default: [] },
    heroTitle: { type: String, default: '' },
    heroDescription: { type: String, default: '' },
    aboutTitle: { type: String, default: '' },
    aboutDescription: { type: String, default: '' },
    bookingCTA: { type: String, default: 'Book an Appointment' },
    whatsappDefaultMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.BusinessSettings || mongoose.model('BusinessSettings', businessSettingsSchema);
