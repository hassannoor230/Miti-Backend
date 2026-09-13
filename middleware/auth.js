const jwt = require('jsonwebtoken');

function getTokenFromRequest(req) {
  if (req.cookies && req.cookies.miti_admin_token) return req.cookies.miti_admin_token;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function signAdminToken(admin) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ sub: String(admin._id || admin.id), email: admin.email, role: 'admin' }, secret, {
    expiresIn: '12h',
  });
}

function requireAdmin(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Session expired — please log in again' });
  }
}

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('miti_admin_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie('miti_admin_token', { path: '/' });
}

module.exports = { requireAdmin, signAdminToken, setAuthCookie, clearAuthCookie, getTokenFromRequest };
