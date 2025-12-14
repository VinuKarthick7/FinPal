import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
export const AVATAR_UPLOADS_DIR = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(AVATAR_UPLOADS_DIR)) {
  fs.mkdirSync(AVATAR_UPLOADS_DIR, { recursive: true });
}

// Store the upload in memory so routes can normalize/optimize images (e.g., resize, strip EXIF).
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

// Configure multer
export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

export default uploadAvatar;
