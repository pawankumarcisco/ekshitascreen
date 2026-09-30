import React, { useState, useEffect } from 'react';
import {
  Shield,
  Server,
  Activity,
  FileText,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLog, HealthCheckResponse } from '../types';

export const SystemNetwork: React.FC = () => {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [h, logs] = await Promise.all([
        api.getHealth(),
        api.getAuditLogs()
      ]);
      setHealth(h);
      setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Network Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Backend Server</h3>
              <p className="text-[11px] text-slate-400">Local LAN Node</p>
            </div>
          </div>
          <div className="space-y-1 text-xs text-slate-600 mt-4">
            <div className="flex justify-between">
              <span>Service:</span>
              <span className="font-semibold text-slate-800">{health?.service || 'screencast'}</span>
            </div>
            <div className="flex justify-between">
              <span>Network Mode:</span>
              <span className="font-mono text-emerald-600 font-semibold">{health?.mode || 'local'}</span>
            </div>
            <div className="flex justify-between">
              <span>HTTP Port:</span>
              <span className="font-mono text-slate-800">3000 / 4000</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">WebSocket Gateway</h3>
              <p className="text-[11px] text-slate-400">Real-time Push Updates</p>
            </div>
          </div>
          <div className="space-y-1 text-xs text-slate-600 mt-4">
            <div className="flex justify-between">
              <span>Protocol:</span>
              <span className="font-mono text-slate-800">ws:// or wss://</span>
            </div>
            <div className="flex justify-between">
              <span>Update Events:</span>
              <span className="font-semibold text-slate-800">CONTENT_UPDATE</span>
            </div>
            <div className="flex justify-between">
              <span>Heartbeat Interval:</span>
              <span className="font-mono text-slate-800">30 seconds</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Device Security</h3>
              <p className="text-[11px] text-slate-400">Android Keystore</p>
            </div>
          </div>
          <div className="space-y-1 text-xs text-slate-600 mt-4">
            <div className="flex justify-between">
              <span>Device Tokens:</span>
              <span className="font-mono text-slate-800">AES-256 GCM</span>
            </div>
            <div className="flex justify-between">
              <span>Code Expiry:</span>
              <span className="font-mono text-slate-800">15 minutes</span>
            </div>
            <div className="flex justify-between">
              <span>Offline Tolerance:</span>
              <span className="text-emerald-600 font-semibold">Indefinite</span>
            </div>
          </div>
        </div>
      </div>

      {/* API Reference & Swagger */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">REST & WebSocket API Endpoints</h3>
            <p className="text-xs text-slate-500">Documented contracts for device activation, manifests, and sync</p>
          </div>
          <a
            href="/api/docs/swagger.json"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors border border-sky-200"
          >
            <span>OpenAPI JSON</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs font-mono">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-emerald-700 font-bold">GET</span> /api/health
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">Unauthenticated health probe</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-sky-700 font-bold">POST</span> /api/device/activation/request
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">Generate SC-XXXXXX code</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-sky-700 font-bold">POST</span> /api/screens/register
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">Pair screen via dashboard</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-emerald-700 font-bold">GET</span> /api/device/manifest
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">Fetch published media manifest</p>
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">System Audit Logs</h3>
            <p className="text-xs text-slate-500">Security and synchronization activity trail</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase">
                <th className="py-2.5 px-6">Timestamp</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400 font-sans">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-6 text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800 font-sans">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 truncate max-w-md">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
