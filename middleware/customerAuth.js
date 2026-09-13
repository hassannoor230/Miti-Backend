const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

function getTokenFromRequest(req) {
  if (req.cookies && req.cookies.miti_customer_token) return req.cookies.miti_customer_token;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function signCustomerToken(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email, role: user.role || 'customer' },
    getSecret(),
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

/**
 * Authenticate a customer. Fails closed — returns 401 if no/invalid token.
 */
function requireCustomer(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
  try {
    const payload = verifyToken(token);
    req.customer = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Session expired — please log in again' });
  }
}

/**
 * Authenticate either a customer or an admin.
 */
function requireAny(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
  try {
    const payload = verifyToken(token);
    req.auth = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Session expired — please log in again' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    const payload = req.auth || req.customer || req.admin;
    if (!payload) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (payload.role !== role) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    return next();
  };
}

function setCustomerCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('miti_customer_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearCustomerCookie(res) {
  res.clearCookie('miti_customer_token', { path: '/' });
}

module.exports = {
  getTokenFromRequest,
  signCustomerToken,
  verifyToken,
  requireCustomer,
  requireAny,
  requireRole,
  setCustomerCookie,
  clearCustomerCookie,
};