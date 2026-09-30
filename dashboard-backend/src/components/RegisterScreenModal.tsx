import React, { useState } from 'react';
import { X, Tv, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { DashboardUser } from '../types';

interface RegisterScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCode?: string;
  users: DashboardUser[];
}

export const RegisterScreenModal: React.FC<RegisterScreenModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCode = '', users
}) => {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  React.useEffect(() => {
    if (isOpen && initialCode) {
      setCode(initialCode);
    }
    if (isOpen) {
      setError(null);
    }
  }, [isOpen, initialCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !userId) {
      setError('Please provide the activation code, screen name, and assigned user');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.registerScreen({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        userId,
        config: {
          width: 1920,
          height: 1080,
          orientation: 'LANDSCAPE',
          rotation: 0,
          fitMode: 'FIT',
          intervalSeconds: 10,
          transition: 'FADE',
          transitionDurationMs: 400,
          loop: true,
          shuffle: false,
          autoStart: true
        }
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Check the activation code on the TV.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Register New Screen</h2>
              <p className="text-xs text-slate-500">Pair an Android TV player using its on-screen code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Activation Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. SC-482913"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-lg font-mono tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white uppercase"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Enter the 6-character code displayed on the Android TV screen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Screen Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Lobby Entrance TV"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. Ground Floor Lobby"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
          </div>

          <div><label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Assigned User <span className="text-red-500">*</span></label><select required value={userId} onChange={e => setUserId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"><option value="">Select a user</option>{users.filter(user => user.isActive && user.role !== 'ADMIN').map(user => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}</select><p className="text-xs text-slate-500 mt-1">Only this user will see and manage the registered screen.</p></div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Notes
            </label>
            <textarea
              placeholder="e.g. 65-inch 4K TV mounted behind front reception desk"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          {/* Initial Defaults preview */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800">Initial Default Configuration:</span>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-500 mt-1">
              <span>Resolution: 1920×1080</span>
              <span aria-hidden="true">·</span>
              <span>Orientation: Landscape</span>
              <span aria-hidden="true">·</span>
              <span>Interval: 10s</span>
              <span aria-hidden="true">·</span>
              <span>Transition: Fade</span>
              <span aria-hidden="true">·</span>
              <span>Loop: Enabled</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-sm transition-colors disabled:opacity-60"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Register Screen</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
