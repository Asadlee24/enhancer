const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UploadResponse {
  task_id: string;
  encoding_used: boolean;
  warnings: string[];
}

export interface StatusResponse {
  status: 'queued' | 'patching' | 'encoding' | 'completed' | 'error' | 'cancelled';
  elapsed_seconds: number;
  warnings: string[];
  error: string | null;
}

export interface UploadProgressCallback {
  onProgress: (percent: number) => void;
  onComplete: (response: UploadResponse) => void;
  onError: (message: string) => void;
}

/**
 * XHR-based upload with real byte-progress tracking.
 * Returns the XHR instance so callers can abort() if needed.
 */
export function uploadVideo(
  file: File,
  encoding: boolean,
  callbacks: UploadProgressCallback
): XMLHttpRequest {
  const xhr = new XMLHttpRequest();
  const formData = new FormData();
  formData.append('video', file);
  formData.append('encoding', String(encoding));

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      callbacks.onProgress(percent);
    }
  });

  xhr.addEventListener('load', () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const data: UploadResponse = JSON.parse(xhr.responseText);
        callbacks.onComplete(data);
      } catch {
        callbacks.onError('Server returned an invalid response.');
      }
    } else {
      try {
        const err = JSON.parse(xhr.responseText);
        callbacks.onError(err.error || `Server error ${xhr.status}`);
      } catch {
        callbacks.onError(`Server error ${xhr.status}`);
      }
    }
  });

  xhr.addEventListener('error', () => callbacks.onError('Network error. Check your connection.'));
  xhr.addEventListener('abort', () => callbacks.onError('Upload cancelled.'));

  xhr.open('POST', `${API_URL}/upload`);
  xhr.send(formData);
  return xhr;
}

/**
 * Poll GET /encoding/status/:id every 2000ms.
 * Returns an AbortController-compatible cleanup handle.
 */
export function pollStatus(
  taskId: string,
  onUpdate: (status: StatusResponse) => void,
  intervalMs = 2000
): () => void {
  let active = true;

  async function tick() {
    if (!active) return;
    try {
      const res = await fetch(`${API_URL}/encoding/status/${taskId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        onUpdate({ status: 'error', elapsed_seconds: 0, warnings: [], error: err.error });
        active = false;
        return;
      }
      const data: StatusResponse = await res.json();
      onUpdate(data);
      if (data.status === 'completed' || data.status === 'error' || data.status === 'cancelled') {
        active = false;
        return;
      }
    } catch {
      // Network hiccup — keep polling
    }
    if (active) setTimeout(tick, intervalMs);
  }

  setTimeout(tick, intervalMs);
  return () => { active = false; };
}

/**
 * Send heartbeat POST /encoding/heartbeat every 15s.
 * Returns a cleanup function.
 */
export function startHeartbeat(taskId: string, intervalMs = 15_000): () => void {
  let active = true;

  async function beat() {
    if (!active) return;
    try {
      await fetch(`${API_URL}/encoding/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId })
      });
    } catch { /* ignore */ }
    if (active) setTimeout(beat, intervalMs);
  }

  setTimeout(beat, intervalMs);
  return () => { active = false; };
}

/**
 * Cancel via navigator.sendBeacon (safe on beforeunload).
 * Falls back to a synchronous XHR if sendBeacon is unavailable.
 */
export function cancelTask(taskId: string): void {
  const url = `${API_URL}/encoding/cancel/${taskId}`;
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(url, '');
  }
}

/**
 * Build the download URL for a completed task.
 */
export function getDownloadUrl(taskId: string): string {
  return `${API_URL}/download/${taskId}`;
}
