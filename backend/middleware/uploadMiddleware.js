// Multer configuration for local product image uploads.
// This follows the proposal: save files in the backend uploads directory.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/products');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/jpg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
  };
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedTypes[file.mimetype]?.includes(extension)) {
    const error = new Error('Only JPG, PNG, and WEBP images are allowed.');
    error.statusCode = 400;
    return cb(error, false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter,
});

const validateImageContent = async (req, res, next) => {
  try {
    for (const file of req.files || []) {
      const handle = await fs.promises.open(file.path, 'r');
      const header = Buffer.alloc(12);
      let bytesRead;
      try {
        ({ bytesRead } = await handle.read(header, 0, header.length, 0));
      } finally {
        await handle.close();
      }

      const isJpeg = file.mimetype.startsWith('image/j')
        && bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      const isPng = file.mimetype === 'image/png'
        && bytesRead >= 8 && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const isWebp = file.mimetype === 'image/webp'
        && bytesRead >= 12 && header.toString('ascii', 0, 4) === 'RIFF'
        && header.toString('ascii', 8, 12) === 'WEBP';

      if (!isJpeg && !isPng && !isWebp) {
        await Promise.all((req.files || []).map((uploaded) => fs.promises.unlink(uploaded.path).catch((error) => {
          if (error.code !== 'ENOENT') console.error('Could not remove rejected upload:', error);
        })));
        return res.status(400).json({
          success: false,
          message: 'Uploaded file contents do not match a supported image format.',
        });
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { upload, validateImageContent };
