'use client';

import React from 'react';

type Point = { label: string; value: number };

export default function AdminBarChart({
  title,
  points,
  accent = '#f97316',
}: {
  title: string;
  points: Point[];
  accent?: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const w = 560;
  const h = 180;
  const padL = 28;
  const padR = 12;
  const padT = 16;
  const padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const gap = 4;
  const barW = points.length ? Math.max(6, (innerW - gap * (points.length - 1)) / points.length) : 0;

  return (
    <div className="bg-[#1e2228] border border-gray-800 rounded-2xl p-4 shadow-xl space-y-3">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {points.length === 0 ? (
        <p className="text-xs text-gray-500 py-8 text-center">No data yet.</p>
      ) : (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label={title}>
          {[0.25, 0.5, 0.75, 1].map((t) => {
            const y = padT + innerH * (1 - t);
            return (
              <line
                key={t}
                x1={padL}
                x2={w - padR}
                y1={y}
                y2={y}
                stroke="#374151"
                strokeWidth={1}
              />
            );
          })}
          {points.map((p, i) => {
            const bh = (p.value / max) * innerH;
            const x = padL + i * (barW + gap);
            const y = padT + innerH - bh;
            return (
              <g key={`${p.label}-${i}`}>
                <rect x={x} y={y} width={barW} height={Math.max(bh, 1)} fill={accent} rx={3} />
                <text
                  x={x + barW / 2}
                  y={h - 12}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize={9}
                  className="font-mono"
                >
                  {p.label.length > 8 ? `${p.label.slice(0, 7)}…` : p.label}
                </text>
                {p.value > 0 ? (
                  <text
                    x={x + barW / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fill="#e5e7eb"
                    fontSize={9}
                    className="font-mono"
                  >
                    {p.value}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
