import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { getTask } from '../jobs/queue.js';

const router = Router();
const taskIdSchema = z.string().uuid();

/**
 * GET /download/:task_id
 * Streams the processed file back with a content-disposition: attachment header.
 * Returns 404 if the task is not found, not completed, or the file has been cleaned up.
 */
router.get('/:task_id', (req: Request, res: Response) => {
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

  if (task.status !== 'completed') {
    res.status(409).json({ error: `Task is not complete yet (status: ${task.status}).` });
    return;
  }

  if (!task.outputPath || !fs.existsSync(task.outputPath)) {
    res.status(410).json({ error: 'Download link has expired. Please re-upload your file.' });
    return;
  }

  const ext = path.extname(task.outputPath);
  const baseName = path.basename(task.originalName, path.extname(task.originalName));
  const downloadName = `${baseName}_patched${ext}`;

  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.setHeader('Content-Type', 'video/mp4');
  res.sendFile(path.resolve(task.outputPath));
});

export default router;
