import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Patch — Video Metadata & Encoding Tool',
  description:
    'Fix video metadata, normalize MP4 atom headers, and optionally re-encode with optimized settings. Fast, private, no account needed.',
  keywords: ['video patch', 'mp4 fix', 'video metadata', 'video encoding', 'tkhd patch'],
  openGraph: {
    title: 'Patch — Video Metadata & Encoding Tool',
    description: 'Fix video metadata and encode with optimized settings. Free, fast, private.',
    type: 'website'
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
