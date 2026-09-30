import React from 'react';
import { Plus, Shield, LogOut } from 'lucide-react';
import { DashboardUser } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenRegister: () => void;
  onLogout: () => void;
  isServerOnline: boolean;
  user: DashboardUser;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenRegister,
  onLogout,
  isServerOnline,
  user
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Zone 1: Single element wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center text-left focus:outline-none"
            aria-label="EkshitaScreen dashboard"
          >
            <img
              src="/ekshitascreen-logo.png"
              alt="EkshitaScreen"
              className="h-14 w-auto max-w-48 object-contain"
            />
          </button>

          <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className={`w-2 h-2 rounded-full ${isServerOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
              LAN Server
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-600">Port 3000</span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`transition-colors hover:text-slate-900 pb-0.5 border-b-2 ${
              activeTab === 'dashboard'
                ? 'border-sky-600 text-slate-900 font-semibold'
                : 'border-transparent'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('screens')}
            className={`transition-colors hover:text-slate-900 pb-0.5 border-b-2 ${
              activeTab === 'screens'
                ? 'border-sky-600 text-slate-900 font-semibold'
                : 'border-transparent'
            }`}
          >
            Screens
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`transition-colors hover:text-slate-900 pb-0.5 border-b-2 ${
              activeTab === 'media'
                ? 'border-sky-600 text-slate-900 font-semibold'
                : 'border-transparent'
            }`}
          >
            Media Library
          </button>
          {user.role === 'ADMIN' && <button
            onClick={() => setActiveTab('network')}
            className={`transition-colors hover:text-slate-900 pb-0.5 border-b-2 ${
              activeTab === 'network'
                ? 'border-sky-600 text-slate-900 font-semibold'
                : 'border-transparent'
            }`}
          >
            Network & Logs
          </button>}
          {user.role === 'ADMIN' && <button onClick={() => setActiveTab('users')} className={`transition-colors hover:text-slate-900 pb-0.5 border-b-2 ${activeTab === 'users' ? 'border-sky-600 text-slate-900 font-semibold' : 'border-transparent'}`}>Users</button>}
        </nav>

        {/* Zone 3: Actions & Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 mr-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-700">{user.name} · {user.role}</span>
          </div>

          {user.role === 'ADMIN' && <button
            onClick={onOpenRegister}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Screen</span>
          </button>}
          <button onClick={onLogout} title="Log out" aria-label="Log out" className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
