import fs from 'fs/promises';
import path from 'path';
import { patchMP4, inspectMP4 } from '@patch/mp4-atoms';
import { Task, completeTask, failTask } from './queue.js';
import { config } from '../config/index.js';

/**
 * Fast path: binary MP4 atom header patch.
 * Reads the file into a Buffer, uses mp4-atoms to walk tkhd/mvhd atoms
 * and normalize dimensions/matrix, then writes the patched file.
 * No re-encode; typically completes in milliseconds.
 */
export async function runPatchJob(task: Task): Promise<void> {
  try {
    if (task.cancelRequested) {
      return;
    }

    const inputBuffer = await fs.readFile(task.inputPath);
    const info = inspectMP4(inputBuffer);

    const warnings: string[] = [];

    if (!info.hasMoov) {
      warnings.push('No moov atom found — file may use fragmented MP4 (fMP4). Binary patch skipped; try enabling Optimized Encoding instead.');
      // Still write output as copy so user gets a download
      const outputPath = buildOutputPath(task.inputPath, task.id, 'patched');
      await fs.copyFile(task.inputPath, outputPath);
      completeTask(task.id, outputPath, warnings);
      return;
    }

    // Apply the binary patch
    const result = patchMP4(inputBuffer, { normalizeMatrix: true });

    if (result.warnings.length > 0) {
      warnings.push(...result.warnings);
    }

    const outputPath = buildOutputPath(task.inputPath, task.id, 'patched');
    await fs.writeFile(outputPath, inputBuffer);

    completeTask(task.id, outputPath, warnings);
  } catch (err) {
    failTask(task.id, err instanceof Error ? err.message : 'Unknown error during patch');
  }
}

function buildOutputPath(inputPath: string, taskId: string, suffix: string): string {
  const ext = path.extname(inputPath);
  return path.join(config.uploadDir, `${taskId}_${suffix}${ext}`);
}
