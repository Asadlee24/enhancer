import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Support comma-separated origins e.g. "https://app.vercel.app,http://localhost:3000"
const rawOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
export const allowedOrigins = rawOrigin.split(',').map(o => o.trim());

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: allowedOrigins,
  maxUploadSizeMB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '500', 10),
  fileTTLSeconds: parseInt(process.env.FILE_TTL_SECONDS || '300', 10), // 5 minutes TTL
  heartbeatTimeoutSeconds: parseInt(process.env.HEARTBEAT_TIMEOUT_SECONDS || '30', 10), // 30 seconds inactivity
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads')
};
