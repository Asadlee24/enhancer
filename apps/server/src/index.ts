import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import uploadRouter from './routes/upload.js';
import encodingRouter from './routes/encoding.js';
import downloadRouter from './routes/download.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/upload', uploadRouter);
app.use('/encoding', encodingRouter);
app.use('/download', downloadRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// API stats — real counter, starts at zero
app.get('/api/stats', (_req, res) => {
  // In-memory only for now; persists across requests within a server session
  res.json({ totalProcessed: (global as any).__patchStats ?? 0 });
});

// 404 + Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`\n🎬 Patch API running at http://localhost:${config.port}`);
  console.log(`   Upload dir : ${config.uploadDir}`);
  console.log(`   File TTL   : ${config.fileTTLSeconds}s`);
  console.log(`   Heartbeat  : ${config.heartbeatTimeoutSeconds}s inactivity limit\n`);
});

export default app;
