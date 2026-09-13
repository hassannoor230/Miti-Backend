const crypto = require('crypto');

function generateTempPassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const chars = upper + lower + numbers;
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  // Ensure at least one of each required set
  if (!/[A-Z]/.test(password)) password += upper[bytes[0] % upper.length];
  if (!/[a-z]/.test(password)) password += lower[bytes[1] % lower.length];
  if (!/[0-9]/.test(password)) password += numbers[bytes[2] % numbers.length];
  return password;
}

module.exports = { generateTempPassword };