import './globals.css'
import { PropsWithChildren } from 'react'
import { Toaster } from 'react-hot-toast'
import { Wrench } from 'lucide-react'

export const metadata = {
  title: 'TimberVault - Workshop Scrap Inventory',
  description: 'Local-first workshop tablet PWA for woodworkers',
}

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#121417] text-gray-100 min-h-screen selection:bg-orange-600 selection:text-white">
        <header className="border-b border-gray-800 bg-[#1e2228] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-600 p-2 rounded-lg text-white">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                TimberVault <span className="text-xs bg-orange-600/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-mono">TABLET PWA</span>
              </h1>
              <p className="text-xs text-gray-400">Local-First Workshop Offcut & Scrap Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> DEXIE DB ACTIVE
            </span>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-6">
          {children}
        </main>
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e2228', color: '#fff', border: '1px solid #374151' } }} />
      </body>
    </html>
  )
}
