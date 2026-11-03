'use client';

import React, { useState } from 'react';
import QuickLog from '@/components/QuickLog';
import InventoryList from '@/components/InventoryList';
import CutListNesting from '@/components/CutListNesting';
import StorageSettings from '@/components/StorageSettings';
import { PlusCircle, List, Scissors, Settings, Wrench } from 'lucide-react';

type TabType = 'quick-log' | 'inventory' | 'cut-list' | 'storage';

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabType>('cut-list');

  return (
    <main className="min-h-screen bg-[#121417] text-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Main Application Header & Tab Navigation */}
        <header className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
                <Wrench className="w-6 h-6 text-orange-500" /> TimberVault
              </h1>
              <span className="bg-orange-600/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-500/30 uppercase tracking-widest">
                Pro Workshop
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Scrap inventory management, active location slots, and cut-list nesting optimizer.
            </p>
          </div>

          <nav className="flex items-center gap-2 bg-[#121417] p-1.5 rounded-xl border border-gray-800 flex-wrap">
            <button
              onClick={() => setActiveTab('quick-log')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'quick-log'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <PlusCircle className="w-4 h-4" /> Quick Log
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <List className="w-4 h-4" /> Inventory List
            </button>

            <button
              onClick={() => setActiveTab('cut-list')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cut-list'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Scissors className="w-4 h-4" /> Cut-List & Nesting
            </button>

            <button
              onClick={() => setActiveTab('storage')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'storage'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Settings className="w-4 h-4" /> Storage Settings
            </button>
          </nav>
        </header>

        {/* Tab Content Routing */}
        <section className="space-y-6">
          {activeTab === 'quick-log' && <QuickLog />}
          {activeTab === 'inventory' && <InventoryList />}
          {activeTab === 'cut-list' && <CutListNesting />}
          {activeTab === 'storage' && <StorageSettings />}
        </section>

      </div>
    </main>
  );
}