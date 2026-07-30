'use client';

interface EncodingToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

export default function EncodingToggle({ enabled, onChange, disabled = false }: EncodingToggleProps) {
  const id = 'encoding-toggle';

  return (
    <div
      style={{
        padding: '16px 20px',
        background: enabled ? 'rgba(200,146,42,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${enabled ? 'rgba(200,146,42,0.3)' : 'var(--dark-border)'}`,
        borderRadius: 'var(--radius-md)',
        transition: 'all 0.25s ease'
      }}
    >
      {/* Toggle row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <button
          id={id}
          role="switch"
          aria-checked={enabled}
          onClick={() => !disabled && onChange(!enabled)}
          disabled={disabled}
          style={{
            flexShrink: 0,
            width: 44,
            height: 24,
            borderRadius: 99,
            border: 'none',
            background: enabled
              ? 'linear-gradient(135deg, var(--gold), var(--gold-light))'
              : 'var(--dark-border)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            position: 'relative',
            transition: 'background 0.25s ease',
            padding: 0
          }}
          aria-label="Enable optimized encoding"
        >
          <span
            style={{
              position: 'absolute',
              top: 3,
              left: enabled ? 23 : 3,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              transition: 'left 0.22s cubic-bezier(0.4,0,0.2,1)'
            }}
          />
        </button>

        <div style={{ flex: 1 }}>
          <label
            htmlFor={id}
            style={{
              display: 'block',
              color: enabled ? 'var(--gold-light)' : 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.92rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              marginBottom: 4,
              transition: 'color 0.2s ease'
            }}
          >
            Optimized Encoding
            {enabled && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  background: 'var(--gold)',
                  color: 'var(--dark)',
                  padding: '2px 7px',
                  borderRadius: 99
                }}
              >
                3–4 min
              </span>
            )}
          </label>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.55 }}>
            {enabled ? (
              <>
                Full ffmpeg re-encode: better compatibility, smaller file, stream-optimised moov placement.
                <br />
                <span style={{ color: 'var(--warning)', fontSize: '0.78rem' }}>
                  ⚠ May appear stuck at 100% while finalising — this is normal.
                </span>
              </>
            ) : (
              <>
                Fast binary patch: rewrites atom headers only, no quality change, completes instantly.
                <br />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Recommended if your file already went through HandBrake or Adobe Media Encoder.
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
