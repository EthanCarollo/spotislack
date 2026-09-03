import type { H3Event } from 'h3';
import type { TrackSnapshot } from '../../shared/types';
import { requireProviderConfig } from './config';
import { IntegrationError } from './errors';
import { saveUser, type UserRecord } from './store';

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
export const SPOTIFY_SCOPE = 'user-read-currently-playing';
const REFRESH_TOKEN_LIFETIME_MS = 183 * 24 * 60 * 60 * 1000;

interface SpotifyTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface SpotifyTrackItem {
  type: 'track';
  id?: string;
  name?: string;
  uri?: string;
  external_urls?: { spotify?: string };
  artists?: Array<{ name?: string }>;
  album?: { name?: string; images?: Array<{ url?: string }> };
}

interface SpotifyEpisodeItem {
  type: 'episode';
  id?: string;
  name?: string;
  uri?: string;
  external_urls?: { spotify?: string };
  show?: { name?: string; images?: Array<{ url?: string }> };
}

interface SpotifyPlaybackResponse {
  is_playing?: boolean;
  progress_ms?: number | null;
  item?: SpotifyTrackItem | SpotifyEpisodeItem | null;
  device?: { name?: string };
}

export function spotifyAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const url = new URL(SPOTIFY_AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SPOTIFY_SCOPE);
  url.searchParams.set('state', state);
  url.searchParams.set('show_dialog', 'false');
  return url.toString();
}

async function parseSpotifyTokenResponse(response: Response): Promise<SpotifyTokenResponse> {
  const payload = (await response.json().catch(() => ({}))) as SpotifyTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new IntegrationError(
      'spotify',
      payload.error || 'token_exchange_failed',
      payload.error_description || 'Spotify token exchange failed',
      response.status || 502,
    );
  }
  return payload;
}

export async function exchangeSpotifyCode(
  event: H3Event,
  code: string,
  redirectUri: string,
): Promise<SpotifyTokenResponse> {
  const { clientId, clientSecret } = requireProviderConfig(event, 'spotify');
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  return parseSpotifyTokenResponse(response);
}

async function refreshSpotifyToken(
  event: H3Event,
  user: UserRecord,
): Promise<string> {
  if (!user.spotify) {
    throw new IntegrationError('spotify', 'not_connected', 'Spotify is not connected', 401);
  }

  if (user.spotify.refreshTokenExpiresAt <= Date.now()) {
    user.spotify.reauthRequired = true;
    user.updatedAt = Date.now();
    await saveUser(event, user);
    throw new IntegrationError('spotify', 'spotify_reauth_required', 'Spotify refresh token expired', 401);
  }

  const { clientId, clientSecret } = requireProviderConfig(event, 'spotify');
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.spotify.refreshToken,
    }),
  });
  const payload = await response.json().catch(() => ({})) as SpotifyTokenResponse;
  if (!response.ok || !payload.access_token) {
    if (payload.error === 'invalid_grant') {
      user.spotify.reauthRequired = true;
      user.updatedAt = Date.now();
      await saveUser(event, user);
      throw new IntegrationError('spotify', 'spotify_reauth_required', 'Spotify refresh token invalid', 401);
    }
    throw new IntegrationError(
      'spotify',
      payload.error || 'refresh_failed',
      payload.error_description || 'Spotify token refresh failed',
      response.status || 502,
    );
  }

  user.spotify.accessToken = payload.access_token;
  user.spotify.expiresAt = Date.now() + (payload.expires_in ?? 3600) * 1000;
  if (payload.refresh_token) {
    user.spotify.refreshToken = payload.refresh_token;
  }
  user.spotify.reauthRequired = false;
  user.updatedAt = Date.now();
  await saveUser(event, user);
  return user.spotify.accessToken;
}

export async function getSpotifyAccessToken(event: H3Event, user: UserRecord): Promise<string> {
  if (!user.spotify) {
    throw new IntegrationError('spotify', 'not_connected', 'Spotify is not connected', 401);
  }
  if (user.spotify.reauthRequired) {
    throw new IntegrationError('spotify', 'spotify_reauth_required', 'Spotify must be reconnected', 401);
  }
  if (user.spotify.expiresAt > Date.now() + 60_000) {
    return user.spotify.accessToken;
  }
  return refreshSpotifyToken(event, user);
}

function playbackToSnapshot(playback: SpotifyPlaybackResponse): TrackSnapshot | null {
  const item = playback.item;
  if (!item) {
    return null;
  }

  const isEpisode = item.type === 'episode';
  const title = item.name?.trim() || 'Sans titre';
  const artist = isEpisode
    ? item.show?.name?.trim() || 'Podcast'
    : item.artists?.map((artistItem) => artistItem.name?.trim()).filter(Boolean).join(', ') || 'Artiste inconnu';
  const album = isEpisode
    ? item.show?.name?.trim() || 'Podcast'
    : item.album?.name?.trim() || 'Album inconnu';
  const imageUrl = isEpisode ? item.show?.images?.[0]?.url : item.album?.images?.[0]?.url;

  return {
    id: item.id || item.uri || `${item.type}:${title}`,
    kind: isEpisode ? 'episode' : 'track',
    title,
    artist,
    album,
    imageUrl,
    spotifyUrl: item.external_urls?.spotify,
    deviceName: playback.device?.name,
    isPlaying: Boolean(playback.is_playing),
    progressMs: playback.progress_ms ?? undefined,
    observedAt: Date.now(),
  };
}

export function playbackKey(track: TrackSnapshot | null): string {
  return track ? `${track.kind}:${track.id}:${track.isPlaying ? 'playing' : 'paused'}` : 'nothing-playing';
}

export async function getCurrentlyPlaying(
  event: H3Event,
  user: UserRecord,
): Promise<TrackSnapshot | null> {
  let accessToken = await getSpotifyAccessToken(event, user);
  let response = await fetch(`${SPOTIFY_API_URL}/me/player/currently-playing?additional_types=track,episode`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) {
    accessToken = await refreshSpotifyToken(event, user);
    response = await fetch(`${SPOTIFY_API_URL}/me/player/currently-playing?additional_types=track,episode`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  if (response.status === 204) {
    return null;
  }
  const payload = await response.json().catch(() => ({})) as SpotifyPlaybackResponse;
  if (!response.ok) {
    throw new IntegrationError(
      'spotify',
      response.status === 429 ? 'rate_limited' : 'playback_failed',
      'Spotify playback request failed',
      response.status || 502,
    );
  }
  return playbackToSnapshot(payload);
}

export function spotifyRefreshDeadline(): number {
  return Date.now() + REFRESH_TOKEN_LIFETIME_MS;
}
