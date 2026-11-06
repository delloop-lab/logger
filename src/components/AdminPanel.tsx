'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Shield,
  Users,
  MousePointerClick,
  Layers,
  FolderKanban,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import AdminBarChart from '@/components/AdminBarChart';
import { loadAdminDashboard, type AdminDashboardData } from '@/lib/supabase/admin-stats';
import { formatAppVersion } from '@/lib/version';
import { getSupabase } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { notify, toast } from '@/lib/notify';

function fmtWhen(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-[#1e2228] border border-gray-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">{label}</p>
        <Icon className="w-4 h-4 text-orange-500" />
      </div>
      <p className="text-2xl font-black text-white font-mono tabular-nums">{value}</p>
    </div>
  );
}

export default function AdminPanel() {
  const resetWorkshopData = useAppStore((s) => s.resetWorkshopData);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllHits, setShowAllHits] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await loadAdminDashboard();
      setData(next);
      if (next.message) setError(next.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const deleteUser = async (userId: string, label: string) => {
    const ok = await notify.confirm({
      title: 'Delete user?',
      message: `Permanently delete ${label} and all their boards, projects, and hits. This cannot be undone.`,
      confirmLabel: 'Delete user',
      danger: true,
    });
    if (!ok) return;
    const supabase = getSupabase();
    if (!supabase) {
      toast.error('Supabase is not configured.');
      return;
    }
    const { data: result, error: rpcError } = await supabase.rpc('admin_delete_user', {
      target: userId,
    });
    if (rpcError) {
      toast.error(
        rpcError.message.includes('function') || rpcError.message.includes('schema cache')
          ? 'Run migrate-admin-analytics.sql (admin_delete_user), then try again.'
          : rpcError.message
      );
      return;
    }
    if (result && typeof result === 'object' && 'ok' in (result as object) && !(result as { ok?: boolean }).ok) {
      toast.error('Delete failed.');
      return;
    }
    toast.success(`Deleted ${label}.`);
    void refresh();
  };

  const totals = data?.totals;
  const allHits = data?.recentHits || [];
  const visibleHits = showAllHits ? allHits : allHits.slice(0, 10);
  const hasMoreHits = allHits.length > 10;

  return (
    <div className="space-y-6">
      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" /> Admin
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Users, page hits, and workshop totals across Logger. {formatAppVersion()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100 text-xs flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-1">Admin data limited</p>
            <p className="text-amber-100/80 leading-relaxed">{error}</p>
            <p className="text-amber-100/70 mt-2">
              Run <code className="font-mono text-amber-50">supabase/migrate-admin-analytics.sql</code>{' '}
              in the Supabase SQL editor, then refresh.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Users" value={totals?.users ?? '—'} icon={Users} />
        <StatCard label="Hits today" value={totals?.hitsToday ?? '—'} icon={MousePointerClick} />
        <StatCard label="Hits 7d" value={totals?.hits7d ?? '—'} icon={MousePointerClick} />
        <StatCard label="Hits 14d" value={totals?.hitsAll ?? '—'} icon={MousePointerClick} />
        <StatCard label="Boards" value={totals?.boards ?? '—'} icon={Layers} />
        <StatCard label="Projects" value={totals?.projects ?? '—'} icon={FolderKanban} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminBarChart
          title="Page hits (last 14 days)"
          points={(data?.hitsByDay || []).map((d) => ({
            label: d.day.slice(5),
            value: d.count,
          }))}
        />
        <AdminBarChart
          title="Hits by tab"
          accent="#fb923c"
          points={(data?.hitsByTab || []).slice(0, 8).map((d) => ({
            label: d.name,
            value: d.count,
          }))}
        />
      </div>

      <AdminBarChart
        title="Top species in inventory"
        accent="#34d399"
        points={(data?.speciesTop || []).map((d) => ({
          label: d.name,
          value: d.count,
        }))}
      />

      <div className="bg-[#1e2228] border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-bold text-white">Users ({data?.users.length ?? 0})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121417] text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Last seen</th>
                <th className="px-3 py-2 font-semibold">Joined</th>
                <th className="px-3 py-2 font-semibold">Boards</th>
                <th className="px-3 py-2 font-semibold">Projects</th>
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold"> </th>
              </tr>
            </thead>
            <tbody>
              {(data?.users || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    {loading ? 'Loading…' : 'No profiles yet. Users appear after they sign in.'}
                  </td>
                </tr>
              ) : (
                (data?.users || []).map((u) => {
                  const label = u.email || `No email (${u.id.slice(0, 8)})`;
                  return (
                  <tr key={u.id} className="border-t border-gray-800/80 text-gray-300">
                    <td className="px-3 py-2 font-mono text-[11px] text-gray-200">
                      {u.email || (
                        <span className="text-amber-300/90">No email ({u.id.slice(0, 8)})</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]">{fmtWhen(u.lastSeenAt)}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{fmtWhen(u.createdAt)}</td>
                    <td className="px-3 py-2 font-mono">{u.boardCount}</td>
                    <td className="px-3 py-2 font-mono">{u.projectCount}</td>
                    <td className="px-3 py-2">
                      {u.isAdmin ? (
                        <span className="text-orange-300 font-bold">admin</span>
                      ) : (
                        <span className="text-gray-500">user</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {!u.isAdmin ? (
                        <button
                          type="button"
                          onClick={() => void deleteUser(u.id, label)}
                          className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 cursor-pointer bg-transparent border-0 p-1"
                          aria-label={`Delete ${label}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#1e2228] border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-white">Recent page hits</h3>
          </div>
          {allHits.length > 0 ? (
            <span className="text-[11px] text-gray-500 font-mono">
              {showAllHits
                ? `${allHits.length} shown`
                : `Last ${Math.min(10, allHits.length)} of ${allHits.length}`}
            </span>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121417] text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">Tab</th>
                <th className="px-3 py-2 font-semibold">User</th>
                <th className="px-3 py-2 font-semibold">Path</th>
              </tr>
            </thead>
            <tbody>
              {allHits.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                    {loading
                      ? 'Loading…'
                      : 'No hits yet. Browse tabs while signed in to generate data.'}
                  </td>
                </tr>
              ) : (
                visibleHits.map((h) => (
                  <tr key={h.id} className="border-t border-gray-800/80 text-gray-300">
                    <td className="px-3 py-2 font-mono text-[11px]">{fmtWhen(h.createdAt)}</td>
                    <td className="px-3 py-2">{h.tab}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{h.email || '—'}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{h.path}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {hasMoreHits ? (
          <div className="px-4 py-3 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setShowAllHits((v) => !v)}
              className="text-xs font-bold text-orange-400 hover:text-orange-300 cursor-pointer bg-transparent border-0 p-0"
            >
              {showAllHits ? 'Show last 10 only' : `Show all ${allHits.length}`}
            </button>
          </div>
        ) : null}
      </div>

      <div className="bg-red-950/25 border border-red-900/50 px-5 py-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-gray-300">
          <strong className="text-red-300 uppercase tracking-wide mr-2">Danger Zone — Start Fresh:</strong>
          Clears inventory, offcuts, saved projects, and completed cuts.
        </div>
        <button
          type="button"
          onClick={async () => {
            const ok = await notify.confirm({
              title: 'Warning: wipe workshop data?',
              message:
                'This deletes all boards, finished pieces, offcuts, projects, and cut progress. This cannot be undone.',
              confirmLabel: 'Wipe everything',
              danger: true,
            });
            if (!ok) return;
            resetWorkshopData();
            toast.success('Workshop cleared, log stock and start a new project.');
          }}
          className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-700/60 text-red-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Wipe Inventory
        </button>
      </div>
    </div>
  );
}
