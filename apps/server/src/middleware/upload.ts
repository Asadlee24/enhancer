import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { config } from '../config/index.js';

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',    // .mov
  'video/x-m4v',       // .m4v
]);

const ALLOWED_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v']);

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload_${timestamp}${ext}`);
  }
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Accepted: .mp4, .mov, .m4v. Got: ${ext} (${file.mimetype})`));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxUploadSizeMB * 1024 * 1024
  }
});
