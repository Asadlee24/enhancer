export default function Header() {
  return (
    <header
      style={{
        padding: '28px 0 0',
        textAlign: 'center'
      }}
    >
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo mark */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
            <path
              d="M10 22L16 10L22 22M13 18h6"
              stroke="#1A1612"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#C8922A" />
                <stop offset="1" stopColor="#D4AF37" />
              </linearGradient>
            </defs>
          </svg>
          <h1
            style={{
              fontSize: '1.7rem',
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              letterSpacing: '-0.01em',
              background: 'linear-gradient(135deg, #C8922A 0%, #D4AF37 50%, #C8922A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Patch
          </h1>
        </div>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontWeight: 500
          }}
        >
          Video Metadata &amp; Encoding Tool
        </p>
        <div className="gold-line" style={{ marginTop: 4 }} />
      </div>
    </header>
  );
}
