import React, { useState } from 'react';
import {
  GripVertical,
  Trash2,
  Clock,
  Eye,
  EyeOff,
  Plus,
  Send,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { PlaylistItem, MediaAsset, Playlist } from '../types';

interface PlaylistEditorProps {
  screenId: string;
  publishedPlaylist: Playlist | null;
  draftPlaylist: Playlist | null;
  mediaAssets: MediaAsset[];
  onSaveDraft: (items: any[]) => Promise<void>;
  onPublish: () => Promise<void>;
  appliedVersion?: number;
  publishedVersion?: number;
}

export const PlaylistEditor: React.FC<PlaylistEditorProps> = ({
  screenId,
  publishedPlaylist,
  draftPlaylist,
  mediaAssets,
  onSaveDraft,
  onPublish,
  appliedVersion = 0,
  publishedVersion = 0
}) => {
  // Use draft if exists, otherwise fallback to published, otherwise empty
  const initialItems = (draftPlaylist?.items || publishedPlaylist?.items || []).map((item, idx) => ({
    ...item,
    sortOrder: idx + 1
  }));

  const [items, setItems] = useState<PlaylistItem[]>(initialItems);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync state if props change and no local edits
  React.useEffect(() => {
    if (!hasUnsavedChanges) {
      const srcItems = draftPlaylist?.items || publishedPlaylist?.items || [];
      setItems(srcItems.map((item, idx) => ({ ...item, sortOrder: idx + 1 })));
    }
  }, [draftPlaylist, publishedPlaylist, hasUnsavedChanges]);

  const handleDurationChange = (index: number, seconds: number) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      durationSeconds: Math.max(1, Math.min(3600, seconds))
    };
    setItems(updated);
    setHasUnsavedChanges(true);
  };

  const handleToggleEnabled = (index: number) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      enabled: !updated[index].enabled
    };
    setItems(updated);
    setHasUnsavedChanges(true);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      sortOrder: i + 1
    }));
    setItems(updated);
    setHasUnsavedChanges(true);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reordered = updated.map((item, i) => ({ ...item, sortOrder: i + 1 }));
    setItems(reordered);
    setHasUnsavedChanges(true);
  };

  const handleAddMedia = (asset: MediaAsset) => {
    const newItem: PlaylistItem = {
      id: 'temp-' + Date.now(),
      playlistId: 'draft',
      mediaAssetId: asset.id,
      sortOrder: items.length + 1,
      durationSeconds: 10,
      enabled: true,
      mediaAsset: asset
    };
    setItems([...items, newItem]);
    setHasUnsavedChanges(true);
    setShowAssetSelector(false);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = items.map((item, idx) => ({
        mediaAssetId: item.mediaAssetId,
        sortOrder: idx + 1,
        durationSeconds: item.durationSeconds || 10,
        enabled: item.enabled
      }));
      await onSaveDraft(payload);
      setHasUnsavedChanges(false);
      setMessage({ text: 'Draft playlist saved to server.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to save draft.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    const enabledItems = items.filter(i => i.enabled);
    if (enabledItems.length === 0) {
      setMessage({ text: 'Cannot publish an empty playlist. Please add at least one enabled image.', type: 'error' });
      return;
    }

    setPublishing(true);
    setMessage(null);
    try {
      // Save draft first if there are unpersisted edits
      const payload = items.map((item, idx) => ({
        mediaAssetId: item.mediaAssetId,
        sortOrder: idx + 1,
        durationSeconds: item.durationSeconds || 10,
        enabled: item.enabled
      }));
      await onSaveDraft(payload);
      await onPublish();
      setHasUnsavedChanges(false);
      setMessage({ text: 'Published successfully! Android TV notified via WebSocket.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to publish to screen.', type: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Header and Version Telemetry */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Playlist Editor</h3>
          <p className="text-xs text-slate-500">Arrange images, adjust durations, and publish new versions</p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 rounded-md border border-slate-200 font-mono">
            <span className="text-slate-500">Published:</span>
            <span className="font-semibold text-slate-900">v{publishedVersion}</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">Applied:</span>
            <span className={`font-semibold ${publishedVersion !== appliedVersion ? 'text-amber-600' : 'text-emerald-600'}`}>
              v{appliedVersion}
            </span>
          </div>

          <button
            onClick={() => setShowAssetSelector(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors border border-sky-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Images</span>
          </button>
        </div>
      </div>

      {/* Draft Notification Banner */}
      {(hasUnsavedChanges || draftPlaylist) && (
        <div className="px-6 py-2.5 bg-amber-50/80 border-b border-amber-200/60 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-medium">Draft changes available.</span>
            <span className="text-amber-700">The TV is currently running published v{publishedVersion}.</span>
          </div>
          <div className="text-[11px] font-mono text-amber-700">
            {hasUnsavedChanges ? 'Unsaved local edits' : 'Draft stored on server'}
          </div>
        </div>
      )}

      {/* Feedback Alert */}
      {message && (
        <div
          className={`px-6 py-2.5 text-xs flex items-center gap-2 border-b ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Playlist Items List */}
      <div className="p-6">
        {items.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">Playlist is empty</p>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Add images from your media library to start the slideshow.</p>
            <button
              onClick={() => setShowAssetSelector(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
            >
              Select Images
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item, index) => {
              const asset = item.mediaAsset || mediaAssets.find(a => a.id === item.mediaAssetId);
              const previewUrl = asset?.thumbnailUrl || asset?.url || '/storage/media/' + asset?.storageKey;

              return (
                <div
                  key={item.id || index}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    item.enabled
                      ? 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                      : 'bg-slate-50/80 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Reorder manual arrows */}
                    <div className="flex flex-col gap-0.5 text-slate-400">
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="hover:text-slate-700 disabled:opacity-20 p-0.5"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === items.length - 1}
                        className="hover:text-slate-700 disabled:opacity-20 p-0.5"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Order index */}
                    <span className="w-6 text-center text-xs font-mono font-bold text-slate-400 tabular-nums">
                      {index + 1}.
                    </span>

                    {/* Thumbnail */}
                    <div className="w-14 h-9 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={asset?.originalName || 'Slide'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="36" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Filename & specs */}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-xs md:max-w-sm">
                        {asset?.originalName || 'Signage Image'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {asset ? `${asset.width}×${asset.height} · ${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'Media Asset'}
                      </p>
                    </div>
                  </div>

                  {/* Controls: Duration, Enable/Disable, Remove */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <input
                        type="number"
                        min={1}
                        max={3600}
                        value={item.durationSeconds ?? 10}
                        onChange={(e) => handleDurationChange(index, parseInt(e.target.value) || 10)}
                        className="w-10 bg-transparent font-mono font-semibold text-slate-900 text-center focus:outline-none"
                      />
                      <span className="text-slate-400 text-[11px]">sec</span>
                    </div>

                    <button
                      onClick={() => handleToggleEnabled(index)}
                      className={`p-1.5 rounded-md transition-colors ${
                        item.enabled ? 'text-sky-600 hover:bg-sky-50' : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title={item.enabled ? 'Enabled' : 'Disabled'}
                    >
                      {item.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove from playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Actions: Save Draft & Publish to Screen */}
      <div className="px-6 py-4 bg-slate-50/75 border-t border-slate-100 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Total slides: <span className="font-semibold text-slate-800">{items.filter(i => i.enabled).length}</span> enabled
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={saving || publishing}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 shadow-2xs transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-slate-500" />}
            <span>Save Draft</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={saving || publishing || items.filter(i => i.enabled).length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {publishing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Publish to Screen</span>
          </button>
        </div>
      </div>

      {/* Asset Selector Modal Drawer */}
      {showAssetSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Select Media to Add</h4>
                <p className="text-xs text-slate-500">Choose from assets in your local media library</p>
              </div>
              <button
                onClick={() => setShowAssetSelector(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4">
              {mediaAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => handleAddMedia(asset)}
                  className="group rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:border-sky-500 hover:shadow-md transition-all text-left bg-white"
                >
                  <div className="aspect-video bg-slate-100 overflow-hidden relative">
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.originalName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-slate-800 truncate">{asset.originalName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{asset.width}×{asset.height}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
