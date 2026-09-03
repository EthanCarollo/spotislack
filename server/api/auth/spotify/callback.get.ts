import { getQuery, sendRedirect, type H3Event } from 'h3';
import { getAppUrl } from '../../../utils/config';
import { queryString } from '../../../utils/query';
import { consumeOAuthState, getOrCreateSessionUser } from '../../../utils/session';
import { exchangeSpotifyCode, spotifyRefreshDeadline } from '../../../utils/spotify';
import { saveUser } from '../../../utils/store';

function homeRedirect(event: H3Event, key: string, value: string) {
  const url = new URL(getAppUrl(event));
  url.searchParams.set(key, value);
  return sendRedirect(event, url.toString(), 302);
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const error = queryString(query.error);
  const state = queryString(query.state);
  const code = queryString(query.code);

  if (error) {
    return homeRedirect(event, 'error', 'spotify_access_denied');
  }
  if (!consumeOAuthState(event, 'spotify', state) || !code) {
    return homeRedirect(event, 'error', 'spotify_state_mismatch');
  }

  try {
    const redirectUri = `${getAppUrl(event)}/api/auth/spotify/callback`;
    const token = await exchangeSpotifyCode(event, code, redirectUri);
    if (!token.refresh_token) {
      return homeRedirect(event, 'error', 'spotify_missing_refresh_token');
    }
    const user = await getOrCreateSessionUser(event);
    user.spotify = {
      accessToken: token.access_token!,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
      refreshTokenExpiresAt: spotifyRefreshDeadline(),
      scope: token.scope || '',
      reauthRequired: false,
    };
    user.updatedAt = Date.now();
    await saveUser(event, user);
    return homeRedirect(event, 'connected', 'spotify');
  } catch {
    return homeRedirect(event, 'error', 'spotify_connection_failed');
  }
});
