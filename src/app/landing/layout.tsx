import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';
import './landing.css';

export const metadata: Metadata = {
  title: 'TimberVault — Timber inventory, QR labels & cut planning',
  description:
    'Organise your timber inventory, track every board and offcut, plan cuts and reduce waste.',
  openGraph: {
    title: 'TimberVault — Know what timber you have',
    description:
      'Track every board and offcut, plan cuts, reduce waste. Less searching. More making.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function LandingLayout({ children }: PropsWithChildren) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Manrope:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
