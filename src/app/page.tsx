'use client';

import React, { useEffect, useMemo, useState } from 'react';
import QuickLog from '@/components/QuickLog';
import InventoryList from '@/components/InventoryList';
import CutListNesting from '@/components/CutListNesting';
import StorageSettings from '@/components/StorageSettings';
import Dashboard from '@/components/Dashboard';
import ProjectMatcher from '@/components/ProjectMatcher';
import AdminPanel from '@/components/AdminPanel';
import ScannerTab from '@/app/scanner';
import CloudSync from '@/components/CloudSync';
import AuthModal from '@/components/AuthModal';
import AppModal from '@/components/AppModal';
import { useAppStore } from '@/lib/store';
import {
  PlusCircle,
  List,
  Scissors,
  Settings,
  Layers,
  Sparkles,
  QrCode,
  LogOut,
  LogIn,
  UserPlus,
  Shield,
} from 'lucide-react';
import { toast } from '@/lib/notify';
import { signOut } from '@/lib/supabase/auth';
import BrandLogo from '@/components/BrandLogo';
import { isAdminEmail } from '@/lib/admin';
import { recordPageHit } from '@/lib/page-hits';
import { getSupabase } from '@/lib/supabase/client';

type TabType =
  | 'dashboard'
  | 'quick-log'
  | 'inventory'
  | 'cut-list'
  | 'matcher'
  | 'scanner'
  | 'storage'
  | 'admin';

const BASE_TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
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
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loginGateOpen, setLoginGateOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const cloudUserId = useAppStore((s) => s.cloudUserId);
  const authChecked = useAppStore((s) => s.authChecked);
  const cloudReady = useAppStore((s) => s.cloudReady);
  const demoPreview = useAppStore((s) => s.demoPreview);
  const signedIn = Boolean(cloudUserId);
  const showAdmin = signedIn && isAdminEmail(userEmail);

  const tabs = useMemo(() => {
    if (!showAdmin) return BASE_TABS;
    return [...BASE_TABS, { id: 'admin' as const, label: 'Admin', icon: Shield }];
  }, [showAdmin]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setUserEmail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setUserEmail(data.session?.user?.email ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!showAdmin && activeTab === 'admin') setActiveTab('dashboard');
  }, [showAdmin, activeTab]);

  useEffect(() => {
    if (!signedIn || !authChecked) return;
    void recordPageHit(activeTab, '/');
  }, [activeTab, signedIn, authChecked]);

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.ok) {
      setActiveTab('dashboard');
      setLoginGateOpen(false);
      setAuthOpen(false);
      toast.success('Signed out.');
    } else {
      toast.error(result.message);
    }
  };

  const openLogin = (mode: 'signin' | 'signup' = 'signin') => {
    setLoginGateOpen(false);
    setAuthMode(mode);
    setAuthOpen(true);
  };

  /**
   * Preview mode: full empty workshop UI (like a first-time account).
   * Menus/tabs work; any real action (except Log in) asks to sign in.
   */
  const guardLoggedOutAction = (e: React.SyntheticEvent) => {
    if (!authChecked || signedIn) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('[data-login-trigger]')) return;
    if (target.closest('[data-login-gate]') || target.closest('[data-auth-modal]')) return;
    if (target.closest('[data-allow-demo]')) return;
    // Allow browsing header tabs / section nav only
    if (target.closest('[data-nav-tab]')) return;

    const interactive = target.closest(
      'button, a, input, select, textarea, label, [role="button"], summary'
    );
    if (!interactive) return;

    e.preventDefault();
    e.stopPropagation();
    setLoginGateOpen(true);
  };

  // Signed-out: show empty workshop (fresh store). Signed-in: wait for cloud hydrate.
  const showUi = authChecked && (!signedIn || cloudReady);

  return (
    <>
      <CloudSync />
      <div
        className="min-h-screen bg-[#121417] text-gray-100 p-4 md:p-8 font-sans"
        onClickCapture={guardLoggedOutAction}
        onSubmitCapture={guardLoggedOutAction}
      >
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="no-print bg-[#1e2228] border border-gray-800 p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="m-0">
                    <BrandLogo size="lg" />
                  </h1>
                </div>
                <p className="text-xs text-gray-400">
                  Catalogue timber, plan projects, and cut with less waste.
                </p>
                {demoPreview && !signedIn && (
                  <p className="text-[11px] text-amber-300/90 mt-1">
                    Demo preview, sample data only. Log in or sign up, it&apos;s free.
                  </p>
                )}
              </div>
              {!authChecked ? (
                <div className="h-9 w-24 rounded-xl bg-gray-800/60 animate-pulse" />
              ) : signedIn ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded-xl cursor-pointer text-gray-300"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-login-trigger
                    onClick={() => openLogin('signin')}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-xs font-bold rounded-xl cursor-pointer text-white shadow-lg shadow-orange-600/20"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Log in
                  </button>
                  <button
                    type="button"
                    data-login-trigger
                    onClick={() => openLogin('signup')}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-bold rounded-xl cursor-pointer text-white"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-orange-400" /> Create account
                  </button>
                </div>
              )}
            </div>

            <nav className="flex items-center gap-1.5 bg-[#121417] p-1.5 rounded-xl border border-gray-800 flex-wrap">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  data-nav-tab
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
            {!authChecked ? (
              <div className="bg-[#1e2228] border border-gray-800 p-10 rounded-2xl text-center text-sm text-gray-500">
                Checking session…
              </div>
            ) : signedIn && !cloudReady ? (
              <div className="bg-[#1e2228] border border-gray-800 p-10 rounded-2xl text-center text-sm text-gray-500">
                Loading workshop data…
              </div>
            ) : showUi ? (
              <>
                {activeTab === 'dashboard' && (
                  <Dashboard onNavigate={(tab) => setActiveTab(tab as TabType)} />
                )}
                {activeTab === 'quick-log' && (
                  <QuickLog onLogged={() => setActiveTab('inventory')} />
                )}
                {activeTab === 'inventory' && <InventoryList />}
                {activeTab === 'cut-list' && <CutListNesting />}
                {activeTab === 'matcher' && (
                  <ProjectMatcher onOpenCutList={() => setActiveTab('cut-list')} />
                )}
                {activeTab === 'scanner' && <ScannerTab />}
                {activeTab === 'storage' && <StorageSettings />}
                {activeTab === 'admin' && showAdmin && <AdminPanel />}
              </>
            ) : null}
          </section>
        </div>
      </div>

      <div data-login-gate>
        <AppModal
          open={loginGateOpen && !signedIn}
          onClose={() => setLoginGateOpen(false)}
          title="Log in required"
          size="md"
        >
          <p className="text-sm text-gray-300 leading-relaxed">
            You need to log in or register to see stock, projects, cutting drawings, and more.
            It&apos;s free!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              data-login-trigger
              onClick={() => openLogin('signin')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl cursor-pointer"
            >
              <LogIn className="w-4 h-4" /> Log in
            </button>
            <button
              type="button"
              data-login-trigger
              onClick={() => openLogin('signup')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-bold rounded-xl cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-orange-400" /> Create account
            </button>
          </div>
        </AppModal>
      </div>

      <div data-auth-modal>
        <AuthModal
          open={authOpen && !signedIn}
          onClose={() => setAuthOpen(false)}
          initialMode={authMode}
        />
      </div>
    </>
  );
}
