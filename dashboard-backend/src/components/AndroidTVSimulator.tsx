import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Wifi,
  WifiOff,
  Power,
  RefreshCw,
  Sliders,
  Play,
  RotateCw,
  HardDrive,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { api } from '../services/api';

type SimulatorState =
  | 'SPLASH'
  | 'CONNECTING'
  | 'CONNECTION_FAILED'
  | 'ACTIVATION_REQUEST'
  | 'WAITING_FOR_REGISTRATION'
  | 'DOWNLOADING'
  | 'PLAYING';

interface AndroidTVSimulatorProps {
  onOpenRegisterWithCode?: (code: string) => void;
}

export const AndroidTVSimulator: React.FC<AndroidTVSimulatorProps> = ({
  onOpenRegisterWithCode
}) => {
  const [deviceUid] = useState(() => {
    return localStorage.getItem('sim_device_uid') || 'SC-TV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  });

  const [state, setState] = useState<SimulatorState>('SPLASH');
  const [activationCode, setActivationCode] = useState<string>('');
  const [registeredScreenName, setRegisteredScreenName] = useState<string>('');
  const [isNetworkConnected, setIsNetworkConnected] = useState<boolean>(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [manifest, setManifest] = useState<any>(null);
  const [cachedItems, setCachedItems] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [showExitDialog, setShowExitDialog] = useState<boolean>(false);
  const [fullscreen, setFullscreen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('sim_device_uid', deviceUid);
  }, [deviceUid]);

  // Initial Boot Sequence
  const runBootSequence = async () => {
    setState('SPLASH');
    await new Promise((r) => setTimeout(r, 1000));

    if (!isNetworkConnected) {
      if (cachedItems.length > 0) {
        setState('PLAYING');
        return;
      } else {
        setState('CONNECTION_FAILED');
        return;
      }
    }

    setState('CONNECTING');
    try {
      const health = await api.getHealth();
      if (health.status !== 'ok') throw new Error('Health check failed');
    } catch {
      if (cachedItems.length > 0) {
        setState('PLAYING');
        return;
      }
      setState('CONNECTION_FAILED');
      return;
    }

    // Request activation or check status
    setState('ACTIVATION_REQUEST');
    try {
      const res = await fetch('/api/device/activation/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceUid,
          deviceName: 'Android TV Simulator',
          appVersion: '1.0.0',
          androidVersion: '12',
          model: 'Web Leanback Emulator',
          manufacturer: 'EkshitaScreen'
        })
      });
      const data = await res.json();

      if (data.status === 'ACTIVATED') {
        setRegisteredScreenName(data.screenName || 'Display');
        syncContent(data.deviceId);
      } else {
        setActivationCode(data.code);
        setState('WAITING_FOR_REGISTRATION');
      }
    } catch (e) {
      setState('CONNECTION_FAILED');
    }
  };

  useEffect(() => {
    runBootSequence();
  }, [isNetworkConnected]);

  // Polling for activation if waiting
  useEffect(() => {
    if (state !== 'WAITING_FOR_REGISTRATION' || !isNetworkConnected) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/device/activation/status?deviceUid=${deviceUid}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'ACTIVATED') {
          clearInterval(interval);
          setRegisteredScreenName(data.screenName || 'Screen');
          syncContent(data.deviceId);
        }
      } catch (e) {
        // ignore
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [state, isNetworkConnected, deviceUid]);

  // Synchronize Content
  const syncContent = async (deviceId?: string) => {
    setState('DOWNLOADING');
    setDownloadProgress(20);

    try {
      const res = await fetch('/api/device/manifest', {
        headers: { 'X-Device-Uid': deviceUid }
      });
      if (!res.ok) throw new Error('Failed to get manifest');
      const data = await res.json();
      setManifest(data);

      setDownloadProgress(60);
      await new Promise((r) => setTimeout(r, 600));

      setDownloadProgress(90);
      await new Promise((r) => setTimeout(r, 400));

      setCachedItems(data.items || []);
      setDownloadProgress(100);

      // Report applied version
      if (deviceId) {
        await fetch('/api/device/sync-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            targetVersion: data.playlistVersion,
            appliedVersion: data.playlistVersion,
            status: 'COMPLETED',
            progress: 100
          })
        });
      }

      setState('PLAYING');
    } catch (e) {
      if (cachedItems.length > 0) {
        setState('PLAYING');
      } else {
        setState('CONNECTION_FAILED');
      }
    }
  };

  // Heartbeat loop every 30s while running
  useEffect(() => {
    if (!isNetworkConnected || state !== 'PLAYING') return;

    const interval = setInterval(async () => {
      try {
        const actRes = await fetch(`/api/device/activation/status?deviceUid=${deviceUid}`);
        const actData = await actRes.json();
        if (actData.deviceId) {
          await fetch('/api/device/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId: actData.deviceId,
              appVersion: '1.0.0',
              playbackStatus: 'PLAYING',
              appliedVersion: manifest?.playlistVersion || 1,
              freeStorageBytes: 15000000000
            })
          });
        }
      } catch (e) {
        // ignore
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isNetworkConnected, state, deviceUid, manifest]);

  // Slideshow interval timer
  useEffect(() => {
    if (state !== 'PLAYING' || cachedItems.length <= 1) return;

    const currentItem = cachedItems[currentSlideIndex];
    const durationSec = currentItem?.durationSeconds || manifest?.screenConfiguration?.intervalSeconds || 10;

    const timer = setTimeout(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % cachedItems.length);
    }, durationSec * 1000);

    return () => clearTimeout(timer);
  }, [state, currentSlideIndex, cachedItems, manifest]);

  const copyCode = () => {
    navigator.clipboard.writeText(activationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const currentItem = cachedItems[currentSlideIndex];

  return (
    <div className="space-y-6">
      {/* Top Banner and Hardware Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Tv className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Android TV Player Simulator</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Emulates the native Kotlin TV player state machine, offline playback, and remote D-Pad control
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Offline Switch Toggle (Critical Test 2) */}
          <button
            onClick={() => setIsNetworkConnected(!isNetworkConnected)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
              isNetworkConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
            title="Toggle Wi-Fi connection to test offline playback"
          >
            {isNetworkConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isNetworkConnected ? 'LAN Connected' : 'LAN Disconnected (Offline)'}</span>
          </button>

          <button
            onClick={runBootSequence}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            <Power className="w-3.5 h-3.5 text-slate-500" />
            <span>Reboot TV</span>
          </button>
        </div>
      </div>

      {/* Emulator Frame + Remote Control Column */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: TV Bezel and Display */}
        <div className="xl:col-span-8 bg-slate-900 rounded-2xl p-4 sm:p-6 border-8 border-slate-950 shadow-2xl relative">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-2 px-1">
            <span>Device UID: {deviceUid}</span>
            <span>
              Status:{' '}
              <strong className="text-sky-400 font-sans uppercase">{state.replace(/_/g, ' ')}</strong>
            </span>
          </div>

          {/* 16:9 Screen Display */}
          <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative flex items-center justify-center select-none shadow-inner">
            {/* 1. SPLASH STATE */}
            {state === 'SPLASH' && (
              <div className="text-center animate-fadeIn">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-widest font-mono">
                  EKSHITASCREEN
                </h1>
                <p className="text-sm text-sky-400 mt-2 font-medium tracking-wide">
                  Android TV Digital Signage Player
                </p>
              </div>
            )}

            {/* 2. CONNECTING STATE */}
            {state === 'CONNECTING' && (
              <div className="text-center p-6 space-y-3">
                <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
                <h3 className="text-lg font-semibold text-white">Connecting to Local Server</h3>
                <p className="text-xs text-slate-400 font-mono">http://localhost:3000</p>
              </div>
            )}

            {/* 3. CONNECTION FAILED */}
            {state === 'CONNECTION_FAILED' && (
              <div className="text-center p-8 max-w-md">
                <h2 className="text-2xl font-bold text-white mb-2">EKSHITASCREEN</h2>
                <h3 className="text-lg font-semibold text-rose-400 mb-2">Connection Failed</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Unable to connect to the configured local server. Check Ethernet cable or Wi-Fi settings.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={runBootSequence}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            )}

            {/* 4. WAITING FOR REGISTRATION (SC-XXXXXX CODE) */}
            {(state === 'ACTIVATION_REQUEST' || state === 'WAITING_FOR_REGISTRATION') && (
              <div className="text-center p-8 max-w-lg">
                <h2 className="text-xl font-bold text-sky-400 tracking-wider mb-1">EKSHITASCREEN</h2>
                <h3 className="text-2xl font-bold text-white mb-6">Activate Your Screen</h3>

                <div className="inline-block bg-slate-800/90 border-2 border-sky-400 px-8 py-4 rounded-xl shadow-lg mb-4">
                  <span className="text-4xl sm:text-5xl font-mono font-extrabold text-white tracking-widest">
                    {activationCode || 'GENERATING...'}
                  </span>
                </div>

                <div className="text-sm font-semibold text-sky-400 mb-1">
                  Waiting for registration...
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Open the EkshitaScreen Dashboard on your computer and register this activation code.
                </p>

                {activationCode && (
                  <div className="mt-4 flex items-center justify-center gap-2.5">
                    <button
                      onClick={copyCode}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Code Copied' : 'Copy Code'}</span>
                    </button>

                    {onOpenRegisterWithCode && (
                      <button
                        onClick={() => onOpenRegisterWithCode(activationCode)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                      >
                        <Tv className="w-3.5 h-3.5" />
                        <span>Register in Dashboard</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5. DOWNLOADING STATE */}
            {state === 'DOWNLOADING' && (
              <div className="text-center p-8 w-full max-w-md">
                <h3 className="text-lg font-semibold text-white mb-4">Synchronizing Content</h3>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden mb-2">
                  <div
                    className="bg-sky-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>Verifying SHA-256 hashes...</span>
                  <span>{downloadProgress}%</span>
                </div>
              </div>
            )}

            {/* 6. PLAYING STATE */}
            {state === 'PLAYING' && (
              <div className="w-full h-full relative flex items-center justify-center bg-black">
                {currentItem ? (
                  <img
                    key={currentSlideIndex}
                    src={currentItem.downloadUrl || '/storage/media/' + currentItem.assetId}
                    alt={currentItem.filename}
                    className="w-full h-full object-contain animate-fadeIn"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="%2338bdf8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                    }}
                  />
                ) : (
                  <div className="text-center p-8 text-slate-500">
                    <p className="text-sm">Empty playlist</p>
                  </div>
                )}

                {/* Subtle Offline Badge */}
                {!isNetworkConnected && (
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-xs border border-rose-500/50 text-rose-400 text-[10px] px-2 py-0.5 rounded font-mono flex items-center gap-1.5">
                    <WifiOff className="w-3 h-3" />
                    <span>OFFLINE CACHE PLAYBACK ACTIVE</span>
                  </div>
                )}

                {/* Slide indicator */}
                {cachedItems.length > 0 && (
                  <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-xs text-white text-[11px] font-mono px-2.5 py-1 rounded">
                    {currentSlideIndex + 1} / {cachedItems.length}
                  </div>
                )}

                {/* Remote Exit Dialog Overlay */}
                {showExitDialog && (
                  <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-6">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full text-center">
                      <h4 className="text-base font-bold text-white mb-2">Exit EkshitaScreen?</h4>
                      <p className="text-xs text-slate-400 mb-6">
                        Slideshow is currently running. Choose an action using TV remote.
                      </p>
                      <div className="space-y-2">
                        <button
                          onClick={() => setShowExitDialog(false)}
                          className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg"
                        >
                          Continue Slideshow
                        </button>
                        <button
                          onClick={() => {
                            setShowExitDialog(false);
                            runBootSequence();
                          }}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
                        >
                          Restart Application
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Remote Control & Local Storage Cache Inspector */}
        <div className="xl:col-span-4 space-y-6">
          {/* TV Remote Control D-Pad */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Android TV Remote Control</h3>
            <p className="text-xs text-slate-500 mb-4">Simulate physical TV remote key presses</p>

            <div className="flex flex-col items-center">
              {/* D-Pad */}
              <div className="w-40 h-40 bg-slate-100 rounded-full border border-slate-300 relative flex items-center justify-center shadow-inner">
                {/* UP */}
                <button
                  onClick={() => setCurrentSlideIndex(prev => (prev - 1 + cachedItems.length) % (cachedItems.length || 1))}
                  className="absolute top-2 text-slate-600 hover:text-slate-900 p-2"
                  title="Up"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>

                {/* DOWN */}
                <button
                  onClick={() => setCurrentSlideIndex(prev => (prev + 1) % (cachedItems.length || 1))}
                  className="absolute bottom-2 text-slate-600 hover:text-slate-900 p-2"
                  title="Down"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>

                {/* LEFT */}
                <button
                  onClick={() => setCurrentSlideIndex(prev => (prev - 1 + cachedItems.length) % (cachedItems.length || 1))}
                  className="absolute left-2 text-slate-600 hover:text-slate-900 p-2"
                  title="Left"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* RIGHT */}
                <button
                  onClick={() => setCurrentSlideIndex(prev => (prev + 1) % (cachedItems.length || 1))}
                  className="absolute right-2 text-slate-600 hover:text-slate-900 p-2"
                  title="Right"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* OK / CENTER */}
                <button
                  onClick={() => setShowExitDialog(!showExitDialog)}
                  className="w-16 h-16 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center"
                >
                  OK
                </button>
              </div>

              {/* Extra Remote Actions */}
              <div className="grid grid-cols-2 gap-3 w-full mt-6">
                <button
                  onClick={() => setShowExitDialog(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Back / Menu
                </button>
                <button
                  onClick={() => {
                    const next = (currentSlideIndex + 1) % (cachedItems.length || 1);
                    setCurrentSlideIndex(next);
                  }}
                  className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Next Slide
                </button>
              </div>
            </div>
          </div>

          {/* Local Device Cache Inspector */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-slate-900">Device Flash Storage</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {cachedItems.length} cached files
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Images downloaded and verified in internal TV storage for offline playback:
            </p>

            {cachedItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No media stored yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cachedItems.map((item, idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                    <p className="font-semibold text-slate-800 truncate">{item.filename}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      SHA: {item.sha256?.slice(0, 16)}... · {item.durationSeconds}s
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
