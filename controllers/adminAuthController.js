const { isMongoReady } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAdmin, signAdminToken, setAuthCookie, clearAuthCookie } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jsondb = require('../utils/jsondb');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json({ success: false, message: 'Email and password are required.' });
  }
  const normalized = String(email).toLowerCase().trim();
  let admin;
  if (isMongoReady()) {
    const Admin = require('../models/Admin');
    admin = await Admin.findOne({ email: normalized });
  } else {
    admin = jsondb.findOne('admins', (a) => String(a.email).toLowerCase() === normalized);
  }
  if (!admin || !admin.passwordHash) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }
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
    admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role || 'admin' },
  });
});

const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out.' });
});

const me = asyncHandler(async (req, res) => {
  if (isMongoReady()) {
    const Admin = require('../models/Admin');
    const admin = await Admin.findById(req.admin.sub).select('-passwordHash');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });
    return res.json({ success: true, data: admin });
  }
  const admin = jsondb.find('admins', req.admin.sub);
  if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });
  const { passwordHash, ...safe } = admin;
  res.json({ success: true, data: safe });
});

module.exports = { login, logout, me };
