import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getTask, heartbeat, cancelTask } from '../jobs/queue.js';

const router = Router();

const taskIdSchema = z.string().uuid();
const heartbeatBodySchema = z.object({ task_id: z.string().uuid() });

/**
 * GET /encoding/status/:task_id
 * Poll every ~2s from the client.
 * Returns: { status, elapsed_seconds }
 */
router.get('/status/:task_id', (req: Request, res: Response) => {
  const parsed = taskIdSchema.safeParse(req.params.task_id);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid task_id.' });
    return;
  }

  const task = getTask(parsed.data);
  if (!task) {
    res.status(404).json({ error: 'Task not found or expired.' });
    return;
  }

  res.json({
    status: task.status,
    elapsed_seconds: task.elapsedSeconds,
    warnings: task.warnings,
    error: task.errorMessage ?? null
  });
});

/**
 * POST /encoding/heartbeat
 * Body: { task_id }
 * Client sends every 15s while job is active.
 * Resets the 30s inactivity timeout.
 */
router.post('/heartbeat', (req: Request, res: Response) => {
  const parsed = heartbeatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'task_id (UUID) is required.' });
    return;
  }

  const ok = heartbeat(parsed.data.task_id);
  if (!ok) {
    res.status(404).json({ error: 'Task not found or expired.' });
    return;
  }

  res.json({ ok: true });
});

/**
 * POST /encoding/cancel/:task_id
 * Sent via navigator.sendBeacon on beforeunload.
 * Kills any in-flight ffmpeg process and marks task cancelled.
 */
router.post('/cancel/:task_id', (req: Request, res: Response) => {
  const parsed = taskIdSchema.safeParse(req.params.task_id);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid task_id.' });
    return;
  }

  const ok = cancelTask(parsed.data);
  res.json({ ok });
});

export default router;
