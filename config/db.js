const mongoose = require('mongoose');

let mongoReady = false;
let lastError = null;

function isMongoReady() {
  return mongoReady && mongoose.connection.readyState === 1;
}

function lastConnectionError() {
  return lastError;
}

function getMongoUri() {
  const uri = (process.env.MONGODB_URI || '').trim();
  return uri || null;
}

async function connectDB() {
  const uri = getMongoUri();
  if (!uri) {
    console.log('[db] No MONGODB_URI set — using local JSON store (backend/data/db.json).');
    return false;
  }

  // Reuse an existing open connection.
  if (mongoReady && mongoose.connection.readyState === 1) return true;

  mongoose.connection.on('connected', () => {
    mongoReady = true;
    lastError = null;
    console.log('[db] MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    lastError = err;
    mongoReady = false;
    console.error('[db] MongoDB connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    mongoReady = false;
    console.warn('[db] MongoDB disconnected');
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 8000,
      socketTimeoutMS: 360000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      // Fail fast in serverless so the JSON fallback kicks in immediately.
      connectTimeoutMS: 8000,
    });
    mongoReady = true;
    lastError = null;
    console.log('[db] MongoDB connected');
    return true;
  } catch (err) {
    lastError = err;
    mongoReady = false;
    console.warn('[db] MongoDB connection failed — falling back to JSON store:', err.message);
    return false;
  }
}

module.exports = { connectDB, isMongoReady, lastConnectionError, getMongoUri };
