export type ProviderConnectionStatus = 'connected' | 'disconnected' | 'reauth_required';

export interface ProviderStatus {
  status: ProviderConnectionStatus;
  detail?: string;
}

export interface TrackSnapshot {
  id: string;
  kind: 'track' | 'episode';
  title: string;
  artist: string;
  album: string;
  imageUrl?: string;
  spotifyUrl?: string;
  deviceName?: string;
  isPlaying: boolean;
  progressMs?: number;
  durationMs?: number;
  observedAt: number;
}

export interface AppliedStatus {
  text: string;
  emoji: string;
}

export interface PublicSyncState {
  enabled: boolean;
  manualOverride: boolean;
  lastSyncedAt?: number;
  lastError?: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  spotify: ProviderStatus;
  slack: ProviderStatus;
  sync: PublicSyncState;
  track: TrackSnapshot | null;
}

export interface SyncResponse {
  ok: boolean;
  action: 'updated' | 'unchanged' | 'cleared' | 'skipped' | 'error';
  message: string;
  track: TrackSnapshot | null;
  sync: PublicSyncState;
}
