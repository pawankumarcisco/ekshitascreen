export type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export type ActivationStatus = 'PENDING' | 'ACTIVATED' | 'EXPIRED' | 'CANCELLED';

export type PlaylistStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type SyncStatus = 'PENDING' | 'DOWNLOADING' | 'VERIFYING' | 'APPLYING' | 'COMPLETED' | 'FAILED';

export type Orientation = 'LANDSCAPE' | 'PORTRAIT';

export type FitMode = 'FIT' | 'FILL' | 'STRETCH' | 'CENTER';

export type TransitionType = 'NONE' | 'FADE' | 'SLIDE';

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  deviceUid: string;
  deviceName: string | null;
  appVersion: string;
  androidVersion: string | null;
  model: string | null;
  manufacturer: string | null;
  registered: boolean;
  registeredAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activation {
  id: string;
  deviceId: string;
  code: string;
  codeHash: string;
  codeDisplaySuffix: string | null;
  status: ActivationStatus;
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
}

export interface ScreenConfiguration {
  id: string;
  screenId: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  orientation: Orientation;
  fitMode: FitMode;
  intervalSeconds: number;
  transition: TransitionType;
  transitionDurationMs: number;
  loop: boolean;
  shuffle: boolean;
  autoStart: boolean;
  version: number;
  updatedAt: string;
}

export interface Screen {
  id: string;
  deviceId: string;
  name: string;
  location: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  device?: Device;
  configuration?: ScreenConfiguration;
  activePlaylist?: Playlist;
}

export interface MediaAsset {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  sha256: string;
  createdAt: string;
  url: string;
  thumbnailUrl: string;
  usageCount?: number;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  mediaAssetId: string;
  sortOrder: number;
  durationSeconds: number | null;
  enabled: boolean;
  mediaAsset?: MediaAsset;
}

export interface Playlist {
  id: string;
  screenId: string;
  version: number;
  status: PlaylistStatus;
  createdBy: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: PlaylistItem[];
}

export interface DeviceManifestItem {
  assetId: string;
  filename: string;
  order: number;
  durationSeconds: number;
  sha256: string;
  fileSize: number;
  downloadUrl: string;
}

export interface DeviceManifest {
  screenId: string;
  playlistVersion: number;
  configurationVersion: number;
  screenConfiguration: ScreenConfiguration;
  items: DeviceManifestItem[];
}

export interface DeviceSyncReport {
  id: string;
  deviceId: string;
  targetVersion: number;
  appliedVersion: number | null;
  status: SyncStatus;
  progress: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface DeviceHeartbeatPayload {
  deviceId: string;
  appVersion: string;
  playbackStatus: 'PLAYING' | 'PAUSED' | 'DOWNLOADING' | 'ERROR' | 'IDLE';
  appliedVersion: number;
  freeStorageBytes: number;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  deviceId: string | null;
  action: string;
  details: Record<string, any>;
  createdAt: string;
}

export interface HealthCheckResponse {
  status: 'ok';
  service: 'screencast';
  mode: 'local';
  timestamp: string;
  lanIp?: string;
  wsPort?: number;
}
