export type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export type ActivationStatus = 'PENDING' | 'ACTIVATED' | 'EXPIRED' | 'CANCELLED';

export type PlaylistStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type SyncStatus = 'PENDING' | 'DOWNLOADING' | 'VERIFYING' | 'APPLYING' | 'COMPLETED' | 'FAILED' | 'UP_TO_DATE';

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
  isOnline?: boolean;
}

export interface ScreenConfiguration {
  id: string;
  screenId: string;
  width: number;
  height: number;
  rotation: number;
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

export interface MediaAsset {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  dpi?: 75 | 100 | 150 | 200;
  quality?: number;
  sha256: string;
  createdAt: string;
  url: string;
  thumbnailUrl: string;
  usageCount?: number;
  userId: string;
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

export interface Screen {
  id: string;
  deviceId: string;
  name: string;
  location: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  validUntil: string;
  isSuspended?: boolean;
  device?: Device | null;
  configuration?: ScreenConfiguration;
  publishedVersion?: number;
  draftVersion?: number;
  hasDraftChanges?: boolean;
  itemCount?: number;
  syncStatus?: SyncStatus;
  appliedVersion?: number;
  lastSeenAt?: string | null;
}

export interface DeviceSyncRecord {
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
  uptime: number;
}
