/**
 * Tiny JSON store used when MONGODB_URI is not configured or MongoDB is
 * unreachable (local preview / development / serverless fallback).
 * Mirrors the Mongoose collections so the whole API works identically
 * with or without MongoDB.
 *
 * WRITABLE-FILESYSTEM DETECTION
 *   Vercel's /var/task directory is read-only, but /tmp/ is writable.
 *   On local dev the source data/ dir is writable.  We probe at module
 *   load to pick the right location.  If nothing is writable (rare), we
 *   fall back to a pure in-memory store so the API never crashes with EROFS.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCE_DATA_DIR = path.join(__dirname, '..', 'data');
const SOURCE_DB_FILE = path.join(SOURCE_DATA_DIR, 'db.json');

function getSeedData() {
  const seedData = require('./seed-data');
  return typeof seedData.getInitialDb === 'function' ? seedData.getInitialDb() : seedData;
}

function ensureAdminInDb(db) {
  if (!db.admins || db.admins.length === 0) {
    const bcrypt = require('bcryptjs');
    const email = (process.env.ADMIN_EMAIL || 'admin@mitibeauty.co.uk').toLowerCase();
    const passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'MitiAdmin2026!', 12);
    const now = new Date().toISOString();
    db.admins = [
      {
        _id: uid('admins'),
        name: 'Salon Owner',
        email,
        passwordHash,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
  return db;
}

let memoryDb = null;

function probeWritable(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, '.probe');
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    return true;
  } catch (e) {
    return false;
  }
}

// Choose a writable data directory.
//   1. Source data/ dir  — local dev
//   2. /tmp/             — Vercel serverless (persists across warm invocations)
//   3. in-memory         — last resort, never crashes
let DATA_DIR = SOURCE_DATA_DIR;
let DB_FILE = SOURCE_DB_FILE;
let readOnlyFs = !probeWritable(SOURCE_DATA_DIR);

if (readOnlyFs && probeWritable('/tmp')) {
  DATA_DIR = path.join('/tmp', 'miti-data');
  DB_FILE = path.join(DATA_DIR, 'db.json');
  readOnlyFs = !probeWritable(DATA_DIR);
}

if (readOnlyFs) {
  // No writable location — pure in-memory store.
  memoryDb = ensureAdminInDb(JSON.parse(JSON.stringify(getSeedData())));
}

function ensureSeeded() {
  if (readOnlyFs) {
    if (memoryDb === null) {
      memoryDb = ensureAdminInDb(JSON.parse(JSON.stringify(getSeedData())));
    }
    return;
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    // On Vercel, try to copy the pre-bundled db.json so seeded data
    // (services, reviews, settings) is available immediately.
    if (process.env.VERCEL && fs.existsSync(SOURCE_DB_FILE)) {
      try {
        fs.writeFileSync(DB_FILE, fs.readFileSync(SOURCE_DB_FILE, 'utf8'));
        return;
      } catch (e) {
        /* fall through to seeding from seed-data */
      }
    }
    const initial = ensureAdminInDb(getSeedData());
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  }
}

function readDb() {
  if (readOnlyFs) {
    if (memoryDb === null) {
      memoryDb = ensureAdminInDb(JSON.parse(JSON.stringify(getSeedData())));
    }
    return JSON.parse(JSON.stringify(memoryDb));
  }
  ensureSeeded();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    if (memoryDb !== null) return JSON.parse(JSON.stringify(memoryDb));
    return JSON.parse(JSON.stringify(ensureAdminInDb(getSeedData())));
  }
}

function writeDb(db) {
  if (readOnlyFs) {
    memoryDb = JSON.parse(JSON.stringify(db));
    return;
  }
  ensureSeeded();
  const tmp = DB_FILE + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    // Filesystem became read-only at runtime — switch to in-memory.
    readOnlyFs = true;
    memoryDb = JSON.parse(JSON.stringify(db));
  }
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
  memoryDb = null;
  if (!readOnlyFs && fs.existsSync(DB_FILE)) {
    try {
      fs.unlinkSync(DB_FILE);
    } catch (e) { /* ignore */ }
  }
  ensureSeeded();
  return readDb();
}

module.exports = { all, find, findOne, insert, update, remove, saveSettings, getSettings, resetDb, readDb };
