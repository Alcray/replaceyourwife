import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Replace My Wife: Home Memory',
  description: 'A funny hackathon home memory assistant backed by XTrace.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
