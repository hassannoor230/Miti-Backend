const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

function fileFilter(req, file, cb) {
  const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (ok.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only image files (JPEG, PNG, WebP, GIF, AVIF) are allowed.'));
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 8 * 1024 * 1024, files: 5 } });

module.exports = { upload, UPLOAD_DIR };
