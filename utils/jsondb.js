/**
 * Tiny file-based JSON store used when MONGODB_URI is not configured
 * (local preview / development). Mirrors the Mongoose collections so the
 * whole API works identically with or without MongoDB.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureSeeded() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const seedData = require('./seed-data');
    const initial = typeof seedData.getInitialDb === 'function' ? seedData.getInitialDb() : seedData;
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  }
}

function readDb() {
  ensureSeeded();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    const seedData = require('./seed-data');
    const initial = typeof seedData.getInitialDb === 'function' ? seedData.getInitialDb() : seedData;
    return JSON.parse(JSON.stringify(initial));
  }
}

function writeDb(db) {
  ensureSeeded();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(6).toString('hex')}`;
}

function all(collection) {
  return readDb()[collection] || [];
}

function find(collection, id) {
  return all(collection).find((d) => String(d._id) === String(id) || String(d.id) === String(id)) || null;
}

function findOne(collection, predicate) {
  return all(collection).find(predicate) || null;
}

function insert(collection, doc) {
  const db = readDb();
  db[collection] = db[collection] || [];
  const now = new Date().toISOString();
  const record = { _id: uid(collection), createdAt: now, updatedAt: now, ...doc };
  db[collection].push(record);
  writeDb(db);
  return record;
}

function update(collection, id, patch) {
  const db = readDb();
  const list = db[collection] || [];
  const idx = list.findIndex((d) => String(d._id) === String(id) || String(d.id) === String(id));
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  writeDb(db);
  return list[idx];
}

function remove(collection, id) {
  const db = readDb();
  const list = db[collection] || [];
  const idx = list.findIndex((d) => String(d._id) === String(id) || String(d.id) === String(id));
  if (idx === -1) return false;
  list.splice(idx, 1);
  writeDb(db);
  return true;
}

function saveSettings(patch) {
  const db = readDb();
  db.settings = { ...(db.settings || {}), ...patch, updatedAt: new Date().toISOString() };
  writeDb(db);
  return db.settings;
}

function getSettings() {
  return readDb().settings || null;
}

function resetDb() {
  if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  ensureSeeded();
  return readDb();
}

module.exports = { all, find, findOne, insert, update, remove, saveSettings, getSettings, resetDb, readDb };
