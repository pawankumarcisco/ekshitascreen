import React from 'react';
import { Tv, ExternalLink, RefreshCw, AlertTriangle, Unplug, CalendarClock } from 'lucide-react';
import { Screen, SyncStatus } from '../types';

interface ScreenListProps {
  screens: Screen[];
  loading: boolean;
  onSelectScreen: (screenId: string) => void;
  onRefresh: () => void;
  canUnregister?: boolean;
  onUnregister?: (screen: Screen) => Promise<void>;
  onRenew?: (screen: Screen) => Promise<void>;
}

export const ScreenList: React.FC<ScreenListProps> = ({
  screens,
  loading,
  onSelectScreen,
  onRefresh,
  canUnregister = false,
  onUnregister,
  onRenew
}) => {
  const [unregisteringId, setUnregisteringId] = React.useState<string | null>(null);
  const [renewingId, setRenewingId] = React.useState<string | null>(null);
  const formatLastSeen = (timestamp?: string | null) => {
    if (!timestamp) return 'Never';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 15) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return `${Math.floor(diffSec / 3600)}h ago`;
  };

  const getStatusBadge = (screen: Screen) => {
    if (screen.isSuspended) return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600"><AlertTriangle className="w-3.5 h-3.5" />Suspended</span>;
    const isOnline = screen.device?.isOnline ?? false;
    const syncStatus = screen.syncStatus;
    const isUpToDate = (screen.publishedVersion || 0) > 0 && screen.publishedVersion === screen.appliedVersion;

    if (!isOnline) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className="w-2 h-2 rounded-full bg-slate-300" />
          Offline
        </span>
      );
    }

    if (syncStatus === 'DOWNLOADING' || syncStatus === 'VERIFYING' || syncStatus === 'APPLYING') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
          <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
          Syncing
        </span>
      );
    }

    if (syncStatus === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600">
          <AlertTriangle className="w-3 h-3 text-rose-500" />
          Sync Failed
        </span>
      );
    }

    if (isUpToDate) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Up to Date
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600">
        <span className="w-2 h-2 rounded-full bg-sky-500" />
        Online
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Connected Screens</h2>
          <p className="text-xs text-slate-500">Live operational status and versioning across network</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {screens.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Tv className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No Screens Registered</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Launch the EkshitaScreen player on your Android TV and use the on-screen activation code to pair it.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-6">Screen Name</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Resolution</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Images</th>
                <th className="py-3 px-4 text-center">Published</th>
                <th className="py-3 px-4 text-center">Applied</th>
                <th className="py-3 px-4">Last Seen</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {screens.map((screen) => {
                const config = screen.configuration;
                const resolutionStr = config ? `${config.width}×${config.height}` : '1920×1080';
                const isOutOfSync = (screen.publishedVersion || 0) !== (screen.appliedVersion || 0);

                return (
                  <tr
                    key={screen.id}
                    onClick={() => onSelectScreen(screen.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
                          <Tv className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{screen.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {screen.device?.model || 'Android TV'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {screen.location || <span className="text-slate-400 italic">Not set</span>}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {resolutionStr}
                      <span className="text-[10px] text-slate-400 block font-sans">
                        {config?.orientation || 'LANDSCAPE'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(screen)}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-slate-700">
                      {screen.itemCount ?? 0}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono tabular-nums">
                      <span className="font-semibold text-slate-900">
                        v{screen.publishedVersion || 0}
                      </span>
                      {screen.hasDraftChanges && (
                        <span className="block text-[10px] text-amber-600 font-sans">
                          Draft ready
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono tabular-nums">
                      <span className={`font-semibold ${isOutOfSync ? 'text-amber-600' : 'text-slate-700'}`}>
                        v{screen.appliedVersion || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {formatLastSeen(screen.lastSeenAt)}
                    </td>

                    <td className={`py-3.5 px-4 text-[11px] ${screen.isSuspended ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                      {new Date(screen.validUntil).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2"><button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectScreen(screen.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors"
                      >
                        <span>Manage</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      {canUnregister && onUnregister && <button disabled={unregisteringId === screen.id} onClick={async (e) => { e.stopPropagation(); if (!confirm(`Unregister “${screen.name}”? This removes its configuration and playlists. The TV can be registered again with a new activation code.`)) return; setUnregisteringId(screen.id); try { await onUnregister(screen); } catch (err) { alert(err instanceof Error ? err.message : 'Failed to unregister screen'); } finally { setUnregisteringId(null); } }} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"><Unplug className="w-3 h-3"/><span>{unregisteringId === screen.id ? 'Removing…' : 'Unregister'}</span></button>}
                      {canUnregister && onRenew && <button disabled={renewingId === screen.id} onClick={async (e) => { e.stopPropagation(); if (!confirm(`Renew “${screen.name}” for one year?`)) return; setRenewingId(screen.id); try { await onRenew(screen); } catch (err) { alert(err instanceof Error ? err.message : 'Failed to renew screen'); } finally { setRenewingId(null); } }} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors disabled:opacity-50"><CalendarClock className="w-3 h-3"/><span>{renewingId === screen.id ? 'Renewing…' : 'Renew 1 Year'}</span></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
