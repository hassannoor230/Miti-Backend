const multer = require('multer');
const path = require('path');

/**
 * Serverless-safe upload middleware.
 *
 * Uses multer.memoryStorage() so uploaded images are buffered in memory
 * instead of being written to the (read-only) Vercel disk. The controllers
 * are responsible for persisting the buffer wherever appropriate
 * (Mongo GridFS, cloud storage, etc.) — local disk is never assumed.
 */
function makeFilename(file) {
  const safe = path.basename(file.originalname || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${Date.now()}-${safe}`;
}

function fileFilter(req, file, cb) {
  const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (ok.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only image files (JPEG, PNG, WebP, GIF, AVIF) are allowed.'));
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
});

module.exports = { upload, makeFilename };