/* Seed script: node utils/seed.js [--reset]
 * Seeds MongoDB when MONGODB_URI is set, otherwise seeds the JSON store.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { connectDB, isMongoReady } = require('../config/db');
const seedData = require('./seed-data');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mitibeauty.co.uk';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MitiAdmin2026!';

async function seedMongo(reset) {
  const Admin = require('../models/Admin');
  const BusinessSettings = require('../models/BusinessSettings');
  const Service = require('../models/Service');
  const Review = require('../models/Review');
  const Gallery = require('../models/Gallery');

  if (reset) {
    await Promise.all([
      Admin.deleteMany({}),
      BusinessSettings.deleteMany({}),
      Service.deleteMany({}),
      Review.deleteMany({}),
      Gallery.deleteMany({}),
    ]);
  }

  const settingsCount = await BusinessSettings.countDocuments();
  if (settingsCount === 0) await BusinessSettings.create({ ...seedData.settings });

  const serviceCount = await Service.countDocuments();
  if (serviceCount === 0) await Service.insertMany(seedData.services);

  const reviewCount = await Review.countDocuments();
  if (reviewCount === 0) await Review.insertMany(seedData.reviews);

  let admin = await Admin.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (!admin) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    admin = await Admin.create({ name: 'Salon Owner', email: ADMIN_EMAIL.toLowerCase(), passwordHash });
    console.log(`[seed] Admin created: ${admin.email}`);
  } else {
    console.log(`[seed] Admin already exists: ${admin.email}`);
  }
  console.log('[seed] MongoDB seeding complete.');
}

async function seedJson(reset) {
  const jsondb = require('./jsondb');
  if (reset) jsondb.resetDb();
  const db = jsondb.readDb();
  if (!db.admins || db.admins.length === 0) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    jsondb.insert('admins', { name: 'Salon Owner', email: ADMIN_EMAIL.toLowerCase(), passwordHash, role: 'admin' });
    console.log(`[seed] JSON admin created: ${ADMIN_EMAIL.toLowerCase()}`);
  } else {
    console.log('[seed] JSON admin already exists.');
  }
  console.log('[seed] JSON store seeding complete.');
}

async function main() {
  const reset = process.argv.includes('--reset');
  const connected = await connectDB();
  if (connected && isMongoReady()) {
    await seedMongo(reset);
    process.exit(0);
  } else {
    await seedJson(reset);
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('[seed] Failed:', e);
  process.exit(1);
});
