import dynamic from 'next/dynamic';

// Lazy-load Three.js canvas — not SSR safe
const MadeBySignature = dynamic(() => import('./MadeBySignature'), { ssr: false });

export default function Footer() {
  return (
    <footer
      style={{
        padding: '40px 0 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        borderTop: '1px solid var(--dark-border)',
        marginTop: 60
      }}
    >
      <MadeBySignature />

      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', maxWidth: 420 }}>
        Download links expire in 5 minutes. Files are deleted from our servers automatically.
        No account required, no data retained.
      </p>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
        © {new Date().getFullYear()} Patch — Open Source
      </p>
    </footer>
  );
}
