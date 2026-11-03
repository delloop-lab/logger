'use client';

import React from 'react';
import { useAppStore, PROJECT_TEMPLATES } from '@/lib/store';
import { Sparkles, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProjectMatcherProps {
  onOpenCutList: () => void;
}

function normalizeSpecies(value: string) {
  return value.toLowerCase().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
}

export default function ProjectMatcher({ onOpenCutList }: ProjectMatcherProps) {
  const boards = useAppStore((s) => s.boards);
  const setActiveProjectName = useAppStore((s) => s.setActiveProjectName);
  const setActiveParts = useAppStore((s) => s.setActiveParts);

  const activeBoards = boards.filter((b) => b.status === 'active');

  const assessed = PROJECT_TEMPLATES.map((template) => {
    const matches = activeBoards.filter((board) => {
      const speciesOk = template.requiredSpecies.some(
        (req) => normalizeSpecies(req) === normalizeSpecies(board.species)
      );
      if (!speciesOk) return false;
      const fitsDirect =
        board.length >= template.minLength &&
        board.width >= template.minWidth &&
        board.thickness >= template.minThickness;
      const fitsRotated =
        board.length >= template.minWidth &&
        board.width >= template.minLength &&
        board.thickness >= template.minThickness;
      return fitsDirect || fitsRotated;
    });

    let status: 'READY' | 'ALMOST' | 'SHORT' = 'SHORT';
    if (matches.length >= 2) status = 'READY';
    else if (matches.length === 1) status = 'ALMOST';

    return { template, matches, status };
  });

  const startFromTemplate = (templateId: string) => {
    const item = assessed.find((a) => a.template.id === templateId);
    if (!item || item.matches.length === 0) {
      toast.error('Not enough matching stock for this template yet.');
      return;
    }

    const { template, matches } = item;
    setActiveProjectName(template.name);
    setActiveParts([
      {
        id: `${template.id}-part`,
        name: template.name,
        species: matches[0].species,
        length: template.minLength,
        width: template.minWidth,
        thickness: template.minThickness,
        quantity: Math.min(matches.length, 4),
      },
    ]);
    toast.success(`Started project from template: ${template.name}`);
    onOpenCutList();
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-2 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-500" /> What Can I Build?
        </h2>
        <p className="text-xs text-gray-400">
          Suggestions from your available inventory. No Jewel Case template — add timber first for better matches.
        </p>
      </div>

      {activeBoards.length === 0 && (
        <div className="bg-[#1e2228] border border-dashed border-gray-700 p-8 rounded-2xl text-center text-sm text-gray-400">
          Inventory is empty. Log boards in Quick Log, then return here for project ideas.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {assessed.map(({ template, matches, status }) => {
          const tone =
            status === 'READY'
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
              : status === 'ALMOST'
                ? 'bg-orange-950/40 text-orange-400 border-orange-800/50'
                : 'bg-gray-800 text-gray-400 border-gray-700';

          return (
            <div
              key={template.id}
              className="bg-[#1e2228] border border-gray-800 p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono bg-gray-800 text-gray-300 px-2 py-1 rounded-lg">
                    {template.difficulty}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${tone}`}>
                    {status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{template.name}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{template.description}</p>
                <p className="text-[11px] text-gray-500 font-mono">
                  Needs: {template.requiredSpecies.join(', ')} · min{' '}
                  {template.minLength}×{template.minWidth}×{template.minThickness} mm
                </p>
                <p className="text-[11px] text-gray-400">
                  Matching boards: <strong className="text-white">{matches.length}</strong>
                </p>
              </div>

              <button
                type="button"
                disabled={matches.length === 0}
                onClick={() => startFromTemplate(template.id)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  matches.length === 0
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-500 text-white cursor-pointer'
                }`}
              >
                Start cut list <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
