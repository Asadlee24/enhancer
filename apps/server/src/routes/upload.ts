import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { upload } from '../middleware/upload.js';
import { createTask, getTask } from '../jobs/queue.js';
import { runPatchJob } from '../jobs/patch.js';
import { runEncodeJob } from '../jobs/encode.js';

const router = Router();

const uploadBodySchema = z.object({
  encoding: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1')
});

/**
 * POST /upload
 * Accepts multipart: video (file), encoding (bool string)
 * Returns: { task_id, encoding_used, warnings: [] }
 */
router.post(
  '/',
  upload.single('video'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No video file provided. Field name must be "video".' });
        return;
      }

      const parsed = uploadBodySchema.safeParse(req.body);
      const encodingUsed = parsed.success ? parsed.data.encoding : false;

      const task = createTask(req.file.path, req.file.originalname, encodingUsed);

      // Immediately update task status before dispatching
      task.status = encodingUsed ? 'encoding' : 'patching';

      // Fire and forget — job runs in background
      const jobFn = encodingUsed ? runEncodeJob : runPatchJob;
      void jobFn(task);

      res.status(202).json({
        task_id: task.id,
        encoding_used: encodingUsed,
        warnings: []
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
