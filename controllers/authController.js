const bcrypt = require('bcryptjs');
const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { signAdminToken, setAuthCookie, clearAuthCookie } = require('../middleware/auth');
const jsondb = require('../utils/jsondb');
let Admin;
try {
  Admin = require('../models/Admin');
} catch (e) { /* model loads after mongoose anyway */ }

async function findAdminByEmail(email) {
  const normalized = String(email || '').toLowerCase().trim();
  if (isMongoReady()) return Admin.findOne({ email: normalized });
  return jsondb.findOne('admins', (a) => String(a.email).toLowerCase() === normalized);
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json({ success: false, message: 'Email and password are required.' });
  }
  const admin = await findAdminByEmail(email);
  if (!admin) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  const ok = await bcrypt.compare(String(password), admin.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

  if (isMongoReady()) {
    admin.lastLoginAt = new Date();
    await admin.save();
  } else {
    jsondb.update('admins', admin._id, { lastLoginAt: new Date().toISOString() });
  }

  const token = signAdminToken(admin);
  setAuthCookie(res, token);
  res.json({
    success: true,
    message: 'Logged in successfully.',
    token,
    admin: { id: admin._id, name: admin.name, email: admin.email },
  });
});

const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out.' });
});

const me = asyncHandler(async (req, res) => {
  const admin = isMongoReady()
    ? await Admin.findById(req.admin.sub).select('-passwordHash')
    : jsondb.find('admins', req.admin.sub);
  if (!admin) return res.status(401).json({ success: false, message: 'Admin not found.' });
  const { passwordHash, ...safe } = admin.toObject ? admin.toObject() : admin;
  res.json({ success: true, admin: { id: safe._id, name: safe.name, email: safe.email } });
});

module.exports = { login, logout, me };
