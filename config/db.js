const mongoose = require('mongoose');

let mongoReady = false;

function isMongoReady() {
  return mongoReady && mongoose.connection.readyState === 1;
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === '') {
    console.log('[db] No MONGODB_URI set — using local JSON store (backend/data/db.json).');
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    mongoReady = true;
    console.log('[db] MongoDB connected');
    return true;
  } catch (err) {
    mongoReady = false;
    console.warn('[db] MongoDB connection failed — falling back to JSON store:', err.message);
    return false;
  }
}

module.exports = { connectDB, isMongoReady };
