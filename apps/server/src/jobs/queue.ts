import { randomUUID } from 'crypto';
import { promises as fsPromises } from 'fs';
import { config } from '../config/index.js';

export type TaskStatus = 'queued' | 'patching' | 'encoding' | 'completed' | 'error' | 'cancelled';

export interface Task {
  id: string;
  status: TaskStatus;
  inputPath: string;
  outputPath: string | null;
  originalName: string;
  encodingUsed: boolean;
  warnings: string[];
  errorMessage?: string;
  createdAt: number;
  completedAt?: number;
  lastHeartbeat: number;
  elapsedSeconds: number;
  cancelRequested: boolean;
  ffmpegProcess?: { kill: () => void };
}

const tasks = new Map<string, Task>();

function cleanupTask(task: Task): void {
  void (async () => {
    try {
      await fsPromises.unlink(task.inputPath).catch(() => {});
      if (task.outputPath) await fsPromises.unlink(task.outputPath).catch(() => {});
    } catch { /* ignore */ }
  })();
}

// --- Heartbeat timeout & TTL cleanup sweep ---
setInterval(() => {
  const now = Date.now();
  for (const [id, task] of tasks.entries()) {
    if (
      (task.status === 'encoding' || task.status === 'patching') &&
      now - task.lastHeartbeat > config.heartbeatTimeoutSeconds * 1000
    ) {
      console.log(`[queue] Task ${id} timed out (no heartbeat). Cancelling.`);
      task.ffmpegProcess?.kill();
      task.status = 'cancelled';
      task.cancelRequested = true;
      task.completedAt = now;
    }

    if (
      (task.status === 'completed' || task.status === 'error' || task.status === 'cancelled') &&
      task.completedAt &&
      now - task.completedAt > config.fileTTLSeconds * 1000
    ) {
      console.log(`[queue] Task ${id} expired after TTL. Cleaning up.`);
      cleanupTask(task);
      tasks.delete(id);
    }
  }
}, 5_000);

// --- Elapsed-time updater ---
setInterval(() => {
  const now = Date.now();
  for (const task of tasks.values()) {
    if (task.status === 'encoding' || task.status === 'patching') {
      task.elapsedSeconds = Math.floor((now - task.createdAt) / 1000);
    }
  }
}, 1_000);

export function createTask(
  inputPath: string,
  originalName: string,
  encodingUsed: boolean
): Task {
  const id = randomUUID();
  const now = Date.now();
  const task: Task = {
    id,
    status: 'queued',
    inputPath,
    outputPath: null,
    originalName,
    encodingUsed,
    warnings: [],
    createdAt: now,
    lastHeartbeat: now,
    elapsedSeconds: 0,
    cancelRequested: false
  };
  tasks.set(id, task);
  return task;
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id);
}

export function heartbeat(id: string): boolean {
  const task = tasks.get(id);
  if (!task) return false;
  task.lastHeartbeat = Date.now();
  return true;
}

export function cancelTask(id: string): boolean {
  const task = tasks.get(id);
  if (!task) return false;
  task.cancelRequested = true;
  task.ffmpegProcess?.kill();
  if (task.status !== 'completed') {
    task.status = 'cancelled';
    task.completedAt = Date.now();
  }
  return true;
}

export function completeTask(id: string, outputPath: string, warnings: string[] = []): void {
  const task = tasks.get(id);
  if (!task) return;
  task.status = 'completed';
  task.outputPath = outputPath;
  task.warnings = warnings;
  task.completedAt = Date.now();
  task.elapsedSeconds = Math.floor((task.completedAt - task.createdAt) / 1000);
}

export function failTask(id: string, errorMessage: string): void {
  const task = tasks.get(id);
  if (!task) return;
  task.status = 'error';
  task.errorMessage = errorMessage;
  task.completedAt = Date.now();
  task.elapsedSeconds = Math.floor((task.completedAt - task.createdAt) / 1000);
}

export function getStats(): { totalCompleted: number } {
  let totalCompleted = 0;
  for (const task of tasks.values()) {
    if (task.status === 'completed') totalCompleted++;
  }
  return { totalCompleted };
}
