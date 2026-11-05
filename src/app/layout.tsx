import './globals.css';
import { PropsWithChildren } from 'react';
import NotifyHost from '@/components/NotifyHost';
import AppFooter from '@/components/AppFooter';

export const metadata = {
  title: 'Logger, Workshop Timber Inventory',
  description: 'Timber inventory, projects, and cutting plans for the workshop',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#121417] text-gray-100 min-h-screen pb-12 selection:bg-orange-600 selection:text-white">
        {children}
        <AppFooter />
        <NotifyHost />
      </body>
    </html>
  );
}
