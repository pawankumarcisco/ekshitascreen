import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ScreenList } from './components/ScreenList';
import { ScreenDetail } from './components/ScreenDetail';
import { MediaLibrary } from './components/MediaLibrary';
import { SystemNetwork } from './components/SystemNetwork';
import { RegisterScreenModal } from './components/RegisterScreenModal';
import { LoginPage } from './components/LoginPage';
import { UsersPage } from './components/UsersPage';
import { api, clearAuthToken, getAuthToken } from './services/api';
import { Screen, MediaAsset, DashboardUser } from './types';
import {
  Layers,
  ArrowRight
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'screens' | 'media' | 'network' | 'users'>('dashboard');
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerInitialCode, setRegisterInitialCode] = useState('');
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [checkingSession, setCheckingSession] = useState(true);

  const [screens, setScreens] = useState<Screen[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(true);

  // Load screens and media
  const loadData = async () => {
    setLoading(true);
    try {
      const [screenList, mediaList] = await Promise.all([
        api.getScreens(),
        api.getMedia()
      ]);
      setScreens(screenList);
      setMediaAssets(mediaList);
      setIsServerOnline(true);
    } catch (err) {
      console.error('Failed to fetch data', err);
      setIsServerOnline(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadData();
    if (user.role === 'ADMIN') api.getUsers().then(setUsers).catch(() => {});

    // WebSocket subscription for instantaneous updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.type === 'SCREEN_LIST_UPDATED' ||
            data.type === 'PLAYLIST_PUBLISHED' ||
            data.type === 'DEVICE_HEARTBEAT' ||
            data.type === 'DEVICE_SYNC_UPDATE'
          ) {
            // Silently refresh data
            api.getScreens().then(setScreens).catch(() => {});
          }
        } catch (e) {}
      };
    } catch (e) {
      console.warn('WS initialization skipped');
    }

    // Polling fallback every 15s
    const pollTimer = setInterval(() => {
      api.getScreens().then(setScreens).catch(() => {});
    }, 15000);

    return () => {
      clearInterval(pollTimer);
      if (ws) ws.close();
    };
  }, [user]);

  useEffect(() => {
    if (!getAuthToken()) {
      setCheckingSession(false);
      return;
    }
    api.getCurrentUser()
      .then(setUser)
      .catch(clearAuthToken)
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  // Summary Metrics
  const totalScreens = screens.length;
  const onlineScreens = screens.filter((s) => s.device?.isOnline).length;
  const offlineScreens = totalScreens - onlineScreens;
  const pendingUpdates = screens.filter(
    (s) => s.publishedVersion && s.publishedVersion !== s.appliedVersion
  ).length;
  const syncFailed = screens.filter((s) => s.syncStatus === 'FAILED').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-sky-100 selection:text-sky-900">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab: any) => {
          setActiveTab(tab);
          if (tab !== 'screens') setSelectedScreenId(null);
        }}
        onOpenRegister={() => {
          api.getUsers().then(setUsers).catch(() => {});
          setIsRegisterOpen(true);
        }}
        onLogout={() => {
          clearAuthToken();
          setUser(null);
          setActiveTab('dashboard');
        }}
        isServerOnline={isServerOnline}
        user={user}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Summary KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Total Screens
                </span>
                <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  {totalScreens}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Registered in LAN</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Online Screens
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                  {onlineScreens}
                </div>
                <span className="text-[11px] text-emerald-600/80 mt-1 block">Recent heartbeat &le; 90s</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Offline Screens
                </span>
                <div className="text-2xl font-bold font-mono text-slate-500 tabular-nums">
                  {offlineScreens}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Cached playback active</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Pending Updates
                </span>
                <div className="text-2xl font-bold font-mono text-amber-600 tabular-nums">
                  {pendingUpdates}
                </div>
                <span className="text-[11px] text-amber-600/80 mt-1 block">Queued for download</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Sync Failed
                </span>
                <div className="text-2xl font-bold font-mono text-rose-600 tabular-nums">
                  {syncFailed}
                </div>
                <span className="text-[11px] text-rose-600/80 mt-1 block">Fallback retained</span>
              </div>
            </div>

            {/* Screens High-Density Grid */}
            <ScreenList
              screens={screens}
              loading={loading}
              onSelectScreen={(screenId) => {
                setSelectedScreenId(screenId);
                setActiveTab('screens');
              }}
              onRefresh={loadData}
              canUnregister={user.role === 'ADMIN'}
              onUnregister={async (screen) => { await api.unregisterScreen(screen.id); await loadData(); }}
              onRenew={async (screen) => { await api.renewScreen(screen.id); await loadData(); }}
            />

            {/* Quick Actions & Highlights */}
            <div className="grid grid-cols-1 gap-4">
              <div
                onClick={() => setActiveTab('media')}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-300 hover:shadow-xs cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Media Library & Uploads</h3>
                    <p className="text-xs text-slate-500">{mediaAssets.length} Full HD & 4K media assets stored locally</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>

            </div>
          </div>
        )}

        {/* SCREENS TAB */}
        {activeTab === 'screens' && (
          <div>
            {selectedScreenId ? (
              <ScreenDetail
                screenId={selectedScreenId}
                onBack={() => setSelectedScreenId(null)}
                mediaAssets={mediaAssets}
              />
            ) : (
              <ScreenList
                screens={screens}
                loading={loading}
                onSelectScreen={(screenId) => setSelectedScreenId(screenId)}
                onRefresh={loadData}
                canUnregister={user.role === 'ADMIN'}
                onUnregister={async (screen) => { await api.unregisterScreen(screen.id); await loadData(); }}
                onRenew={async (screen) => { await api.renewScreen(screen.id); await loadData(); }}
              />
            )}
          </div>
        )}

        {/* MEDIA LIBRARY TAB */}
        {activeTab === 'media' && (
          <MediaLibrary
            assets={mediaAssets}
            loading={loading}
            onRefresh={loadData}
          />
        )}

        {/* SYSTEM & NETWORK TAB */}
        {activeTab === 'network' && user.role === 'ADMIN' && <SystemNetwork />}
        {activeTab === 'users' && user.role === 'ADMIN' && <UsersPage />}

      </main>

      {/* Screen Registration Modal */}
      <RegisterScreenModal
        isOpen={isRegisterOpen}
        initialCode={registerInitialCode}
        users={users}
        onClose={() => {
          setIsRegisterOpen(false);
          setRegisterInitialCode('');
        }}
        onSuccess={() => {
          loadData();
          setActiveTab('screens');
        }}
      />
    </div>
  );
}
export default App;
