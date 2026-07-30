'use client';

import { useState, useRef, useCallback } from 'react';

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ['.mp4', '.mov', '.m4v'];
const ACCEPTED_MIMES = ['video/mp4', 'video/quicktime', 'video/x-m4v'];
const MAX_MB = 500;

function formatMB(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function validateFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIMES.includes(file.type)) {
    return `Unsupported format. Please upload ${ACCEPTED_TYPES.join(', ')} files.`;
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return `File is too large (${formatMB(file.size)}). Maximum is ${MAX_MB} MB.`;
  }
  return null;
}

export default function DropZone({ onFile, disabled = false }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSelectedFile(file);
    onFile(file);
  }, [onFile]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const borderColor = error
    ? 'var(--error)'
    : dragging
    ? 'var(--gold)'
    : selectedFile
    ? 'var(--gold-muted)'
    : 'var(--dark-border)';

  const bgColor = dragging
    ? 'rgba(200,146,42,0.06)'
    : 'transparent';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Drop zone: click or drag a video file here"
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: 'var(--radius-lg)',
          background: bgColor,
          padding: '44px 24px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.22s ease, background 0.22s ease',
          opacity: disabled ? 0.5 : 1,
          userSelect: 'none'
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov,.m4v,video/mp4,video/quicktime,video/x-m4v"
          onChange={onInputChange}
          style={{ display: 'none' }}
          aria-hidden="true"
        />

        {/* Icon */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <svg
            width="52"
            height="52"
            viewBox="0 0 52 52"
            fill="none"
            aria-hidden="true"
            style={{ opacity: dragging ? 1 : 0.7, transition: 'opacity 0.2s' }}
          >
            <circle cx="26" cy="26" r="25" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="4 3" />
            <path
              d="M26 34V20M20 26l6-6 6 6"
              stroke="var(--gold)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="16" y="34" width="20" height="3" rx="1.5" fill="var(--gold)" opacity="0.5" />
          </svg>
        </div>

        {selectedFile ? (
          <>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>
              {selectedFile.name}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              {formatMB(selectedFile.size)} · Click to change
            </p>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.95rem', marginBottom: 6 }}>
              {dragging ? 'Release to upload' : 'Drop your video here'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              or <span style={{ color: 'var(--gold)' }}>click to browse</span> · {ACCEPTED_TYPES.join(', ')} · up to {MAX_MB} MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p
          role="alert"
          style={{
            color: 'var(--error)',
            fontSize: '0.83rem',
            padding: '8px 12px',
            background: 'rgba(192,80,77,0.1)',
            border: '1px solid rgba(192,80,77,0.3)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
