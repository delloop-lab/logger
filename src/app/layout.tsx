import './globals.css';
import { PropsWithChildren } from 'react';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'TimberVault — Workshop Timber Inventory',
  description: 'Timber inventory, projects, and cutting plans for the workshop',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#121417] text-gray-100 min-h-screen selection:bg-orange-600 selection:text-white">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1e2228',
              color: '#fff',
              border: '1px solid #374151',
            },
          }}
        />
      </body>
    </html>
  );
}
