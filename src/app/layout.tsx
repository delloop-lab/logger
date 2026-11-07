import './globals.css';
import { PropsWithChildren } from 'react';
import NotifyHost from '@/components/NotifyHost';
import AppFooter from '@/components/AppFooter';

export const metadata = {
  title: 'Logger — Timber inventory, QR labels & cut planning',
  description:
    'Organise your timber inventory, track every board and offcut, plan cuts and reduce waste.',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Manrope:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#121417] text-gray-100 min-h-screen pb-12 selection:bg-orange-600 selection:text-white">
        {children}
        <AppFooter />
        <NotifyHost />
      </body>
    </html>
  );
}
