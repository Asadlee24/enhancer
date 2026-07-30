import { spawn } from 'child_process';
import path from 'path';
import { Task, completeTask, failTask } from './queue.js';
import { config } from '../config/index.js';

/**
 * Slow path: full ffmpeg re-encode.
 * Runs ffmpeg with:
 *   - CRF 23 (visually lossless quality)
 *   - AAC audio at 128k
 *   - -movflags +faststart (moov atom moved to front for streaming)
 *   - pixel format yuv420p (maximum compatibility)
 * 
 * If ffmpeg is not installed, fails gracefully with a descriptive error.
 * The task heartbeat is maintained externally by the client.
 */
export async function runEncodeJob(task: Task): Promise<void> {
  return new Promise((resolve) => {
    if (task.cancelRequested) {
      resolve();
      return;
    }

    const ext = path.extname(task.inputPath);
    const outputPath = path.join(config.uploadDir, `${task.id}_encoded${ext}`);

    const args = [
      '-i', task.inputPath,
      '-c:v', 'libx264',
      '-crf', '23',
      '-preset', 'medium',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      outputPath
    ];

    let stderr = '';

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    // Attach process reference for cancellation
    task.ffmpegProcess = {
      kill: () => proc.kill('SIGTERM')
    };

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.stdout?.on('data', () => {});

    proc.on('error', (err) => {
      if (err.message.includes('ENOENT')) {
        failTask(
          task.id,
          'ffmpeg is not installed on this server. ' +
          'Install ffmpeg and add it to PATH, or disable Optimized Encoding for instant patching.'
        );
      } else {
        failTask(task.id, `ffmpeg process error: ${err.message}`);
      }
      resolve();
    });

    proc.on('close', (code) => {
      task.ffmpegProcess = undefined;

      if (task.cancelRequested) {
        resolve();
        return;
      }

      if (code === 0) {
        completeTask(task.id, outputPath);
      } else {
        // Extract last meaningful line from stderr
        const lastLines = stderr.split('\n').filter(Boolean).slice(-3).join(' | ');
        failTask(task.id, `ffmpeg exited with code ${code}: ${lastLines}`);
      }
      resolve();
    });
  });
}
