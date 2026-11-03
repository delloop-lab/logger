'use client';

import React from 'react';
import { QrCode, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ScannerTab() {
  return (
    <div className="bg-[#1e2228] border border-gray-800 p-8 rounded-2xl text-center space-y-6 max-w-xl mx-auto">
      <div className="bg-orange-600/20 border border-orange-500/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-orange-500">
        <QrCode className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white">Tablet Camera QR Scanner</h3>
        <p className="text-sm text-gray-400">Point tablet camera at board thermal tag sticker.</p>
      </div>
      <div className="bg-[#121417] border border-gray-800 p-8 rounded-xl space-y-4">
        <p className="text-xs font-mono text-gray-500">[CAMERA STREAM READY]</p>
        <button
          onClick={() => toast.success('Scanned OAK-001: Deducted 200mm cut.')}
          className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 mx-auto"
        >
          <Camera className="w-4 h-4" /> Simulate Camera Scan (OAK-001)
        </button>
      </div>
    </div>
  );
}