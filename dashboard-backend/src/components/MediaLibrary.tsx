import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  HardDrive,
  FileCheck
} from 'lucide-react';
import { MediaAsset } from '../types';
import { api } from '../services/api';

interface MediaLibraryProps {
  assets: MediaAsset[];
  loading: boolean;
  onRefresh: () => void;
}

const OUTPUT_WIDTH = 1920;
const OUTPUT_HEIGHT = 1080;
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png'];

async function compressForSignage(file: File, quality: number): Promise<File> {
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is not supported by this browser.');

    // Fill the 16:9 output without distortion, cropping only the overflow.
    const scale = Math.max(OUTPUT_WIDTH / image.width, OUTPUT_HEIGHT / image.height);
    const sourceWidth = OUTPUT_WIDTH / scale;
    const sourceHeight = OUTPUT_HEIGHT / scale;
    const sourceX = (image.width - sourceWidth) / 2;
    const sourceY = (image.height - sourceHeight) / 2;
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        result => result ? resolve(result) : reject(new Error(`Could not process ${file.name}.`)),
        outputType,
        quality / 100
      );
    });
    const extension = outputType === 'image/png' ? 'png' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}-${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}.${extension}`, {
      type: outputType,
      lastModified: Date.now()
    });
  } finally {
    image.close();
  }
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  assets,
  loading,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dpi, setDpi] = useState<75 | 100 | 150 | 200>(150);
  const [quality, setQuality] = useState(80);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [alert, setAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const hasValidExtension = /\.(jpe?g|png)$/i.test(file.name);
      if (VALID_IMAGE_TYPES.includes(file.type) && hasValidExtension) {
        validFiles.push(file);
      } else {
        setAlert({
          text: `Skipped ${file.name}: Only JPEG/JPG and PNG images are supported.`,
          type: 'error'
        });
      }
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    setAlert(null);

    try {
      const compressedFiles = await Promise.all(validFiles.map(file => compressForSignage(file, quality)));
      await api.uploadMedia(compressedFiles, { dpi, quality });
      setAlert({ text: `Uploaded ${compressedFiles.length} image${compressedFiles.length === 1 ? '' : 's'} at 1920×1080, ${dpi} DPI, ${quality}% quality.`, type: 'success' });
      onRefresh();
    } catch (err: any) {
      setAlert({ text: err.message || 'Upload failed.', type: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (asset: MediaAsset) => {
    if (!confirm(`Are you sure you want to delete "${asset.originalName}"?`)) return;

    setAlert(null);
    try {
      await api.deleteMedia(asset.id);
      setAlert({ text: `Deleted "${asset.originalName}" successfully.`, type: 'success' });
      onRefresh();
    } catch (err: any) {
      setAlert({ text: err.message || 'Cannot delete media.', type: 'error' });
    }
  };

  const filteredAssets = assets.filter(a =>
    a.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Media Library</h2>
          <p className="text-xs text-slate-500">Shared asset repository for Full HD and 4K digital signage</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[11px] font-semibold text-slate-600">
            <span className="block mb-1">DPI</span>
            <select
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value) as 75 | 100 | 150 | 200)}
              disabled={uploading}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-normal text-slate-800"
            >
              {[75, 100, 150, 200].map(value => <option key={value} value={value}>{value} DPI</option>)}
            </select>
          </label>
          <label className="min-w-40 text-[11px] font-semibold text-slate-600">
            <span className="mb-1 flex justify-between"><span>Quality</span><span>{quality}%</span></span>
            <input
              type="range"
              min="75"
              max="100"
              step="1"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              disabled={uploading}
              className="block h-8 w-40 accent-sky-600"
            />
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 w-48 sm:w-64"
            />
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>Upload Images</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {/* Alert banner */}
      {alert && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            alert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{alert.text}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-8 bg-slate-50/50 hover:bg-sky-50/20 text-center cursor-pointer transition-all"
      >
        <Upload className="w-8 h-8 text-sky-600 mx-auto mb-2" />
        <h4 className="text-xs font-semibold text-slate-800">Drag & drop signage images here</h4>
        <p className="text-[11px] text-slate-500 mt-0.5">
          JPEG/JPG and PNG only, up to 25 MB. Images are cropped to 1920×1080 and compressed before upload.
        </p>
      </div>

      {/* Assets Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total assets: <strong className="text-slate-700">{filteredAssets.length}</strong></span>
          <span className="font-mono">Local storage: /storage/media</span>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No media assets found matching query.
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAssets.map((asset) => {
              const sizeMb = (asset.fileSize / (1024 * 1024)).toFixed(2);
              const isUsedInActivePlaylist = (asset.usageCount || 0) > 0;

              return (
                <div
                  key={asset.id}
                  className="rounded-xl border border-slate-200 hover:border-slate-300 overflow-hidden bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Media Thumbnail */}
                    <div
                      onClick={() => setPreviewAsset(asset)}
                      className="aspect-video bg-slate-100 relative cursor-pointer group overflow-hidden"
                    >
                      <img
                        src={asset.thumbnailUrl || asset.url}
                        alt={asset.originalName}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                        }}
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                        <ExternalLink className="w-4 h-4" />
                        <span>Preview</span>
                      </div>

                      {/* Usage counter badge */}
                      {isUsedInActivePlaylist && (
                        <div className="absolute top-2 right-2 bg-sky-600/90 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded">
                          {asset.usageCount} {asset.usageCount === 1 ? 'screen' : 'screens'}
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="p-3.5 space-y-1">
                      <p className="text-xs font-semibold text-slate-800 truncate" title={asset.originalName}>
                        {asset.originalName}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>{asset.width}×{asset.height}</span>
                        <span aria-hidden="true">·</span>
                        <span>{sizeMb} MB</span>
                      </div>
                      {(asset.dpi || asset.quality) && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {asset.dpi ? `${asset.dpi} DPI` : ''}{asset.dpi && asset.quality ? ' · ' : ''}{asset.quality ? `${asset.quality}% quality` : ''}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono truncate" title={asset.sha256}>
                        SHA-256: {asset.sha256.slice(0, 16)}...
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-3.5 py-2.5 bg-slate-50/75 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => handleDelete(asset)}
                      className={`p-1.5 rounded-md transition-colors ${
                        isUsedInActivePlaylist
                          ? 'text-slate-300 hover:text-amber-600 hover:bg-amber-50 cursor-pointer'
                          : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title={
                        isUsedInActivePlaylist
                          ? 'Referenced by active playlist (Protected)'
                          : 'Delete media file'
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewAsset && (
        <div
          onClick={() => setPreviewAsset(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-6 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col cursor-default"
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900">{previewAsset.originalName}</h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  {previewAsset.width}×{previewAsset.height} · SHA-256: {previewAsset.sha256}
                </p>
              </div>
              <button
                onClick={() => setPreviewAsset(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img
                src={previewAsset.url}
                alt={previewAsset.originalName}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
