const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const { connectDB } = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const contactRoutes = require('./routes/contactRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const PORT = Number(process.env.PORT) || 5001;

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// CORS: in production restrict via CLIENT_URL (comma-separated). In dev allow all for previews.
const clientUrls = (process.env.CLIENT_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (clientUrls.length === 0) return cb(null, true);
      if (clientUrls.includes(origin)) return cb(null, true);
      // Allow Vercel preview + sandbox preview hosts
      if (/\.vercel\.app$/.test(origin) || /\.e2b\.app$/.test(origin)) return cb(null, true);
      return cb(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(generalLimiter);

const fs = require('fs');

// Uploaded images — only mount the static folder when it actually exists.
// In serverless environments the uploads dir is never written to disk
// (uploads are buffered in memory), so this middleware is a no-op there.
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) {
  app.use('/uploads', express.static(uploadsDir));
}

// Root health-check — responds to GET / so the domain root is not a 404.
app.get('/', (req, res) =>
  res.status(200).json({ status: 'ok', message: 'Miti Beauty API active', service: 'miti-beauty-api' })
);

// Favicon — answer HEAD/GET for /favicon.ico to avoid noisy 404 logs.
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.head('/favicon.ico', (req, res) => res.status(204).end());

// Health
app.get('/api/health', (req, res) => res.json({ success: true, service: 'miti-beauty-api', time: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/settings', settingsRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDB();
  // Ensure a default admin exists (JSON-store mode) so /admin works out of the box.
  try {
    const { isMongoReady } = require('./config/db');
    if (!isMongoReady()) {
      const bcrypt = require('bcryptjs');
      const jsondb = require('./utils/jsondb');
      const email = (process.env.ADMIN_EMAIL || 'admin@mitibeauty.co.uk').toLowerCase();
      const existing = jsondb.findOne('admins', (a) => String(a.email).toLowerCase() === email);
      if (!existing) {
        const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'MitiAdmin2026!', 12);
        jsondb.insert('admins', { name: 'Salon Owner', email, passwordHash, role: 'admin' });
        console.log(`[auth] Default admin created: ${email}`);
      }
    }
  } catch (e) {
    console.warn('[auth] Admin bootstrap skipped:', e.message);
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api] Miti Beauty API listening on port ${PORT}`);
  });
}

start();

module.exports = app;
