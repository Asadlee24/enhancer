'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DropZone from '@/components/DropZone';
import EncodingToggle from '@/components/EncodingToggle';
import ProgressCard from '@/components/ProgressCard';
import DownloadCard from '@/components/DownloadCard';
import {
  uploadVideo,
  pollStatus,
  startHeartbeat,
  cancelTask,
  type UploadResponse,
  type StatusResponse
} from '@/lib/api-client';

// ── App state machine ────────────────────────────────────────────────────────
type AppStage =
  | { name: 'idle' }
  | { name: 'uploading'; percent: number }
  | { name: 'processing'; taskId: string; encodingUsed: boolean; status: StatusResponse }
  | { name: 'done'; taskId: string; fileName: string; warnings: string[]; elapsedSeconds: number }
  | { name: 'error'; message: string };

// ── Toast ─────────────────────────────────────────────────────────────────────
type Toast = { id: number; kind: 'error' | 'success' | 'info'; message: string };

let toastIdCounter = 0;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [encoding, setEncoding] = useState(false);
  const [stage, setStage] = useState<AppStage>({ name: 'idle' });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const stopPollingRef = useRef<(() => void) | null>(null);
  const stopHeartbeatRef = useRef<(() => void) | null>(null);
  const activeTaskIdRef = useRef<string | null>(null);

  function addToast(message: string, kind: Toast['kind'] = 'error') {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  // Cancel in-flight job on page unload
  useEffect(() => {
    const handleUnload = () => {
      if (activeTaskIdRef.current) {
        cancelTask(activeTaskIdRef.current);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPollingRef.current?.();
      stopHeartbeatRef.current?.();
    };
  }, []);

  const reset = useCallback(() => {
    stopPollingRef.current?.();
    stopHeartbeatRef.current?.();
    xhrRef.current?.abort();
    activeTaskIdRef.current = null;
    setFile(null);
    setEncoding(false);
    setStage({ name: 'idle' });
  }, []);

  const handleSubmit = useCallback(() => {
    if (!file || stage.name === 'uploading' || stage.name === 'processing') return;

    setStage({ name: 'uploading', percent: 0 });

    xhrRef.current = uploadVideo(file, encoding, {
      onProgress: (percent) => {
        setStage({ name: 'uploading', percent });
      },
      onComplete: (resp: UploadResponse) => {
        activeTaskIdRef.current = resp.task_id;

        // No encoding → poll once, should already be done or completing fast
        const initialStatus: StatusResponse = {
          status: resp.encoding_used ? 'encoding' : 'patching' as StatusResponse['status'],
          elapsed_seconds: 0,
          warnings: resp.warnings,
          error: null
        };

        setStage({
          name: 'processing',
          taskId: resp.task_id,
          encodingUsed: resp.encoding_used,
          status: initialStatus
        });

        // Heartbeat only needed for encoding (slow path)
        if (resp.encoding_used) {
          stopHeartbeatRef.current = startHeartbeat(resp.task_id);
        }

        stopPollingRef.current = pollStatus(resp.task_id, (s) => {
          if (s.status === 'completed') {
            stopHeartbeatRef.current?.();
            activeTaskIdRef.current = null;
            setStage({
              name: 'done',
              taskId: resp.task_id,
              fileName: file.name,
              warnings: s.warnings,
              elapsedSeconds: s.elapsed_seconds
            });
          } else if (s.status === 'error') {
            stopHeartbeatRef.current?.();
            activeTaskIdRef.current = null;
            const msg = s.error || 'Processing failed. Please try again.';
            setStage({ name: 'error', message: msg });
            addToast(msg, 'error');
          } else if (s.status === 'cancelled') {
            stopHeartbeatRef.current?.();
            activeTaskIdRef.current = null;
            setStage({ name: 'error', message: 'Job was cancelled.' });
          } else {
            setStage((prev) =>
              prev.name === 'processing'
                ? { ...prev, status: s }
                : prev
            );
          }
        });
      },
      onError: (msg) => {
        setStage({ name: 'error', message: msg });
        addToast(msg, 'error');
      }
    });
  }, [file, encoding, stage.name]);

  // ── Derived display ────────────────────────────────────────────────────────
  const isIdle = stage.name === 'idle' || stage.name === 'error';
  const isUploading = stage.name === 'uploading';
  const isProcessing = stage.name === 'processing';
  const isDone = stage.name === 'done';

  const progressPhase: 'uploading' | 'patching' | 'encoding' = isUploading
    ? 'uploading'
    : stage.name === 'processing' && stage.encodingUsed
    ? 'encoding'
    : 'patching';

  return (
    <>
      {/* Background gradient */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          background: 'radial-gradient(ellipse 70% 55% at 50% -10%, rgba(200,146,42,0.11) 0%, transparent 60%), var(--dark)'
        }}
      />

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />

        <main
          className="container"
          style={{
            flex: 1,
            paddingTop: 48,
            paddingBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}
        >
          {/* ── IDLE / ERROR: Upload form ──────────────────────────────────── */}
          {isIdle && (
            <div className="glass-card fade-up" style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: 6 }}>
                  Upload your video
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  MP4, MOV, M4V · max 500 MB · processed server-side, auto-deleted after 5 minutes
                </p>
              </div>

              {stage.name === 'error' && (
                <div
                  role="alert"
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(192,80,77,0.1)',
                    border: '1px solid rgba(192,80,77,0.35)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--error)',
                    fontSize: '0.86rem'
                  }}
                >
                  {stage.message}
                </div>
              )}

              <DropZone onFile={setFile} disabled={false} />
              <EncodingToggle enabled={encoding} onChange={setEncoding} />

              <button
                id="patch-submit-btn"
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!file}
                style={{ alignSelf: 'stretch', justifyContent: 'center', padding: '15px' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M9 2C5.13 2 2 5.13 2 9s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm-1 10V6l5 3-5 3z" fill="currentColor" />
                </svg>
                {encoding ? 'Upload & Encode' : 'Patch Video'}
              </button>
            </div>
          )}

          {/* ── UPLOADING / PROCESSING ─────────────────────────────────────── */}
          {(isUploading || isProcessing) && (
            <ProgressCard
              phase={progressPhase}
              uploadPercent={isUploading ? (stage as { name: 'uploading'; percent: number }).percent : 100}
              elapsedSeconds={
                isProcessing
                  ? (stage as { name: 'processing'; status: StatusResponse }).status.elapsed_seconds
                  : 0
              }
              status={isProcessing ? (stage as { name: 'processing'; status: StatusResponse }).status.status : 'uploading'}
            />
          )}

          {/* ── DONE ─────────────────────────────────────────────────────── */}
          {isDone && stage.name === 'done' && (
            <DownloadCard
              taskId={stage.taskId}
              fileName={stage.fileName}
              warnings={stage.warnings}
              elapsedSeconds={stage.elapsedSeconds}
              onReset={reset}
            />
          )}
        </main>

        <Footer />
      </div>

      {/* ── Toasts ─────────────────────────────────────────────────────────── */}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} role="alert">
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
