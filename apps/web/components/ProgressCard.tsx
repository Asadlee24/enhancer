'use client';

interface ProgressCardProps {
  phase: 'uploading' | 'patching' | 'encoding';
  uploadPercent: number;
  elapsedSeconds: number;
  status: string;
}

const PHASE_LABELS: Record<ProgressCardProps['phase'], string> = {
  uploading: 'Uploading…',
  patching: 'Patching atoms…',
  encoding: 'Encoding…'
};

const PHASE_DESCRIPTIONS: Record<ProgressCardProps['phase'], string> = {
  uploading: 'Your file is being transferred securely.',
  patching: 'Reading and rewriting MP4 header atoms. Nearly done.',
  encoding:
    'Running full ffmpeg re-encode. This takes 3–4 minutes. You may see 100% for a while at the end — that\'s normal while the moov atom is being moved to the front.'
};

function formatTime(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem < 10 ? '0' : ''}${rem}s`;
}

export default function ProgressCard({
  phase,
  uploadPercent,
  elapsedSeconds,
  status
}: ProgressCardProps) {
  const showBar = phase === 'uploading';
  const displayPercent = phase === 'uploading' ? uploadPercent : null;

  return (
    <div
      className="glass-card fade-up"
      style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}
      role="status"
      aria-live="polite"
      aria-label={`${PHASE_LABELS[phase]} ${elapsedSeconds > 0 ? formatTime(elapsedSeconds) + ' elapsed' : ''}`}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="spinner" aria-hidden="true" />
        <div>
          <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 2 }}>
            {PHASE_LABELS[phase]}
          </p>
          {elapsedSeconds > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Elapsed: {formatTime(elapsedSeconds)}
            </p>
          )}
        </div>

        {displayPercent !== null && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'monospace',
              fontSize: '1.2rem',
              fontWeight: 700,
              color: 'var(--gold)',
              minWidth: 48,
              textAlign: 'right'
            }}
          >
            {displayPercent}%
          </span>
        )}
      </div>

      {/* Progress bar (upload phase only) */}
      {showBar && (
        <div>
          <div className="progress-track" role="progressbar" aria-valuenow={uploadPercent} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-fill" style={{ width: `${uploadPercent}%` }} />
          </div>
        </div>
      )}

      {/* Indeterminate shimmer (processing phases) */}
      {!showBar && (
        <div
          className="progress-track"
          aria-hidden="true"
          style={{ overflow: 'hidden', position: 'relative' }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, transparent 0%, var(--gold) 50%, transparent 100%)',
              animation: 'shimmer 1.6s ease-in-out infinite',
              borderRadius: 99
            }}
          />
        </div>
      )}

      {/* Description */}
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.6 }}>
        {PHASE_DESCRIPTIONS[phase]}
      </p>

      {/* Server status if different from phase */}
      {status && status !== phase && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'monospace' }}>
          server: {status}
        </p>
      )}

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
