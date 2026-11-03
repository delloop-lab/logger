'use client';

import React, { useState } from 'react';
import QuickLog from '@/components/QuickLog';
import InventoryList from '@/components/InventoryList';
import CutListNesting from '@/components/CutListNesting';
import StorageSettings from '@/components/StorageSettings';
import Dashboard from '@/components/Dashboard';
import ProjectMatcher from '@/components/ProjectMatcher';
import ScannerTab from '@/app/scanner';
import {
  PlusCircle,
  List,
  Scissors,
  Settings,
  Wrench,
  Layers,
  Sparkles,
  QrCode,
} from 'lucide-react';

type TabType =
  | 'dashboard'
  | 'quick-log'
  | 'inventory'
  | 'cut-list'
  | 'matcher'
  | 'scanner'
  | 'storage';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Layers },
  { id: 'quick-log', label: 'Quick Log', icon: PlusCircle },
  { id: 'inventory', label: 'Inventory', icon: List },
  { id: 'cut-list', label: 'Projects & Cuts', icon: Scissors },
  { id: 'matcher', label: 'What Can I Build?', icon: Sparkles },
  { id: 'scanner', label: 'QR Scanner', icon: QrCode },
  { id: 'storage', label: 'Settings', icon: Settings },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  return (
    <div className="min-h-screen bg-[#121417] text-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl shadow-2xl space-y-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
                  <Wrench className="w-6 h-6 text-orange-500" /> TimberVault
                </h1>
                <span className="bg-orange-600/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-500/30 uppercase tracking-widest">
                  Workshop
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Fresh inventory start — catalogue timber, plan projects, and cut with less waste.
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-3 py-1.5 rounded-lg">
              Local storage · ready for cloud sync
            </span>
          </div>

          <nav className="flex items-center gap-1.5 bg-[#121417] p-1.5 rounded-xl border border-gray-800 flex-wrap">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === id
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            ))}
          </nav>
        </header>

        <section className="space-y-6">
          {activeTab === 'dashboard' && <Dashboard onNavigate={(tab) => setActiveTab(tab as TabType)} />}
          {activeTab === 'quick-log' && <QuickLog />}
          {activeTab === 'inventory' && <InventoryList />}
          {activeTab === 'cut-list' && <CutListNesting />}
          {activeTab === 'matcher' && (
            <ProjectMatcher onOpenCutList={() => setActiveTab('cut-list')} />
          )}
          {activeTab === 'scanner' && <ScannerTab />}
          {activeTab === 'storage' && <StorageSettings />}
        </section>
      </div>
    </div>
  );
}
