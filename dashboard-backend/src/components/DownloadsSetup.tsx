import React, { useState, useEffect } from 'react';
import {
  Download,
  Tv,
  Server,
  FileCode,
  FolderArchive,
  BookOpen,
  Terminal,
  CheckCircle,
  Copy,
  ExternalLink,
  Wifi,
  HardDrive,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';

interface DownloadPackage {
  filename: string;
  name: string;
  description: string;
  tag: string;
  size: number;
  sizeFormatted: string;
  downloadUrl: string;
  exists: boolean;
}

export const DownloadsSetup: React.FC = () => {
  const [packages, setPackages] = useState<DownloadPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/downloads')
      .then((res) => res.json())
      .then((data) => {
        setPackages(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load download packages', err);
        setLoading(false);
      });
  }, []);

  const copyCommand = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-sky-50 text-sky-700 border border-sky-200">
                Phase 1 On-Premise Suite
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 font-mono">LAN Operation · Zero Cloud Dependency</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Download Code & Local Setup
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Download the complete source code for the Android TV Player (Kotlin Studio Project),
              the Web Management Dashboard, and the Local Backend Server for offline LAN deployment.
            </p>
          </div>

          <a
            href="/api/download/screencast-full-monorepo.zip"
            download="screencast-full-monorepo.zip"
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <FolderArchive className="w-4 h-4" />
            <span>Download Complete Monorepo (.zip)</span>
          </a>
        </div>
      </div>

      {/* Package Downloads Grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 px-1">
          Downloadable Packages
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Android TV Player */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Tv className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono">
                  {packages.find((p) => p.filename.includes('android'))?.sizeFormatted || '27 KB'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Android TV Player Project
              </h3>
              <span className="inline-block text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1 mb-2">
                Kotlin · Leanback TV · Compose · Room DB · Gradle Wrapper
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complete native Android TV Studio project with Leanback launcher, D-Pad remote control,
                automatic boot startup receiver, Android Keystore encryption, isolated staging cache,
                and offline playback engine.
              </p>

              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 font-mono space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Target:</span>
                  <span className="text-slate-800 font-semibold">Android TV 9.0–14 (API 28–34)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Output:</span>
                  <span className="text-slate-800">app/build/outputs/apk/debug/app-debug.apk</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">screencast-android-player.zip</span>
              <a
                href="/api/download/screencast-android-player.zip"
                download="screencast-android-player.zip"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Android Project</span>
              </a>
            </div>
          </div>

          {/* 2. Dashboard & Local Backend */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                  <Server className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono">
                  {packages.find((p) => p.filename.includes('dashboard'))?.sizeFormatted || '3.3 MB'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Dashboard & Local Backend Server
              </h3>
              <span className="inline-block text-[11px] font-mono text-sky-700 bg-sky-50 px-2 py-0.5 rounded mt-1 mb-2">
                React 19 · Vite · Express / NestJS · PostgreSQL Prisma · WebSockets
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Full-stack web application featuring desktop signage management, drag-and-drop playlist
                sequencing, draft vs. publish separation, SHA-256 media validation, and real-time WebSocket sync.
              </p>

              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 font-mono space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Runtime:</span>
                  <span className="text-slate-800 font-semibold">Node.js 18+ LTS / PostgreSQL 14+</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">LAN Ports:</span>
                  <span className="text-slate-800">3000 (HTTP/WS) / 5432 (Postgres)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">screencast-dashboard-backend.zip</span>
              <a
                href="/api/download/screencast-dashboard-backend.zip"
                download="screencast-dashboard-backend.zip"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Dashboard & Server</span>
              </a>
            </div>
          </div>

          {/* 3. Complete Monorepo Suite */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono">
                  {packages.find((p) => p.filename.includes('monorepo'))?.sizeFormatted || '9.8 MB'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Complete Monorepo Suite
              </h3>
              <span className="inline-block text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded mt-1 mb-2">
                All Apps · Shared Types · Docker Compose · Test Suites
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Contains the full repository tree including Android player, NestJS backend, React dashboard,
                shared TypeScript DTO package, Docker container configurations, and unit/integration tests.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">screencast-full-monorepo.zip</span>
              <a
                href="/api/download/screencast-full-monorepo.zip"
                download="screencast-full-monorepo.zip"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Full Suite</span>
              </a>
            </div>
          </div>

          {/* 4. Setup Documentation */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono">
                  {packages.find((p) => p.filename.includes('docs'))?.sizeFormatted || '6.5 KB'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Setup Guides & Architecture Docs
              </h3>
              <span className="inline-block text-[11px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded mt-1 mb-2">
                Offline Markdown · Installation · Network · Wi-Fi ADB
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Step-by-step guides for Windows/Ubuntu server deployment, Android TV Developer Options setup,
                wireless ADB installation commands, firewall rules, and REST/WebSocket API specifications.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">screencast-docs-setup.zip</span>
              <a
                href="/api/download/screencast-docs-setup.zip"
                download="screencast-docs-setup.zip"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Docs (.zip)</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Local Setup Instructions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-sky-600" />
            <span>Local Deployment & Installation Walkthrough</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Follow these commands on your computer to build the APK and run the local server.
          </p>
        </div>

        <div className="space-y-6">
          {/* STEP 1: Building Android TV APK */}
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Build Android APK (Using Android Studio or Gradle Wrapper)
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-3 ml-8">
              Extract <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">screencast-android-player.zip</code>.
              You can open the folder in <strong>Android Studio</strong> and click <strong>Run</strong>, or build directly from your terminal:
            </p>

            <div className="ml-8 space-y-2">
              <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono flex items-center justify-between">
                <div>
                  <span className="text-slate-500"># macOS / Linux</span>
                  <br />
                  <span>cd screencast-android-player && ./gradlew assembleDebug</span>
                </div>
                <button
                  onClick={() => copyCommand('cd screencast-android-player && ./gradlew assembleDebug', 1)}
                  className="p-1.5 text-slate-400 hover:text-white"
                  title="Copy command"
                >
                  {copiedIndex === 1 ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono flex items-center justify-between">
                <div>
                  <span className="text-slate-500"># Windows Command Prompt / PowerShell</span>
                  <br />
                  <span>cd screencast-android-player && .\gradlew.bat assembleDebug</span>
                </div>
                <button
                  onClick={() => copyCommand('cd screencast-android-player && .\\gradlew.bat assembleDebug', 2)}
                  className="p-1.5 text-slate-400 hover:text-white"
                  title="Copy command"
                >
                  {copiedIndex === 2 ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 font-mono">
                Generated APK output: <code className="text-sky-700">app/build/outputs/apk/debug/app-debug.apk</code>
              </p>
            </div>
          </div>

          {/* STEP 2: Installing APK via Wi-Fi ADB */}
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Install APK on Android TV (Over Local Wi-Fi)
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-3 ml-8">
              On your Android TV, navigate to <strong>Settings &gt; Device Preferences &gt; About</strong>, click <strong>Build</strong> 7 times
              to enable Developer Options, then toggle <strong>Network Debugging: ON</strong>. Note the TV's IP address:
            </p>

            <div className="ml-8 space-y-2">
              <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono flex items-center justify-between">
                <div>
                  <span className="text-slate-500"># Connect to TV and install over Wi-Fi</span>
                  <br />
                  <span>adb connect &lt;ANDROID_TV_IP&gt;:5555</span>
                  <br />
                  <span>adb install -r app/build/outputs/apk/debug/app-debug.apk</span>
                </div>
                <button
                  onClick={() => copyCommand('adb connect 192.168.1.150:5555 && adb install -r app/build/outputs/apk/debug/app-debug.apk', 3)}
                  className="p-1.5 text-slate-400 hover:text-white"
                  title="Copy command"
                >
                  {copiedIndex === 3 ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* STEP 3: Starting the Local Backend */}
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Start Local Backend Server on Your Computer
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-3 ml-8">
              Extract <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">screencast-dashboard-backend.zip</code>:
            </p>

            <div className="ml-8 space-y-2">
              <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono flex items-center justify-between">
                <div>
                  <span className="text-slate-500"># Install dependencies and start server</span>
                  <br />
                  <span>npm install</span>
                  <br />
                  <span>npm run dev</span>
                </div>
                <button
                  onClick={() => copyCommand('npm install && npm run dev', 4)}
                  className="p-1.5 text-slate-400 hover:text-white"
                  title="Copy command"
                >
                  {copiedIndex === 4 ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Open <code className="font-mono text-sky-700">http://localhost:3000</code> or your PC's LAN IP
                (<code className="font-mono text-sky-700">http://192.168.1.xxx:3000</code>) in your browser.
              </p>
            </div>
          </div>

          {/* STEP 4: Pair Screen & Publish */}
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Pair Screen & Publish First Playlist
              </h3>
            </div>
            <div className="ml-8 space-y-1.5 text-xs text-slate-600">
              <p>• Launch <strong>EkshitaScreen</strong> on the Android TV. The screen displays a 6-digit code (e.g. <span className="font-mono font-bold text-slate-800">SC-482913</span>).</p>
              <p>• In the Web Dashboard, click <strong>Register Screen</strong>, type the code and name your screen (e.g. "Lobby TV").</p>
              <p>• The TV automatically acknowledges registration, downloads the assigned Full HD images, and begins playing the continuous fullscreen loop!</p>
              <p>• Disconnect Wi-Fi at any time to verify <strong>offline playback resilience</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
