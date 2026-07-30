'use client';

import { useEffect, useState } from 'react';
import { getDownloadUrl } from '@/lib/api-client';

interface DownloadCardProps {
  taskId: string;
  fileName: string;
  warnings: string[];
  elapsedSeconds: number;
  onReset: () => void;
}

const EXPIRY_MINUTES = 5;

function formatTime(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function DownloadCard({
  taskId,
  fileName,
  warnings,
  elapsedSeconds,
  onReset
}: DownloadCardProps) {
  const [expired, setExpired] = useState(false);
  const [remaining, setRemaining] = useState(EXPIRY_MINUTES * 60);

  useEffect(() => {
    if (remaining <= 0) { setExpired(true); return; }
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { setExpired(true); clearInterval(t); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const downloadUrl = getDownloadUrl(taskId);
  const baseName = fileName.split('.').slice(0, -1).join('.') || fileName;

  return (
    <div
      className="glass-card fade-up"
      style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 22 }}
      role="region"
      aria-label="Download ready"
    >
      {/* Success badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(92,158,111,0.15)',
            border: '1.5px solid rgba(92,158,111,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M5 11.5L9 15.5L17 7" stroke="#5C9E6F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 3 }}>
            Ready to download
          </p>
          {elapsedSeconds > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Processed in {formatTime(elapsedSeconds)}
            </p>
          )}
        </div>
      </div>

      <div className="gold-line" />

      {/* File info */}
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--dark-border)'
        }}
      >
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Output file</p>
        <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
          {baseName}_patched
        </p>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(212,131,58,0.08)',
            border: '1px solid rgba(212,131,58,0.3)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          {warnings.map((w, i) => (
            <p key={i} style={{ color: 'var(--warning)', fontSize: '0.82rem', lineHeight: 1.5 }}>
              ⚠ {w}
            </p>
          ))}
        </div>
      )}

      {/* Expiry countdown */}
      {!expired && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', gap: 6, alignItems: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6.5 3.5V7L8.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Link expires in {Math.ceil(remaining / 60)}m {remaining % 60}s
        </p>
      )}

      {/* Actions */}
      {!expired ? (
        <a
          href={downloadUrl}
          download
          id={`download-${taskId}`}
          className="btn-primary"
          style={{ justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 2v10M5 8l4 4 4-4M3 15h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Download patched video
        </a>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <p style={{ color: 'var(--error)', fontSize: '0.88rem', textAlign: 'center' }}>
            This download link has expired (5-minute limit).
          </p>
          <button className="btn-secondary" onClick={onReset}>
            Patch another video
          </button>
        </div>
      )}

      <button
        onClick={onReset}
        className="btn-secondary"
        style={{ alignSelf: 'center', fontSize: '0.82rem', padding: '8px 18px' }}
      >
        Patch another video
      </button>
    </div>
  );
}
