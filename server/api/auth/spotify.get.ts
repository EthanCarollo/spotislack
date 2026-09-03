import { sendRedirect } from 'h3';
import { getAppUrl, requireProviderConfig } from '../../utils/config';
import { createOAuthState } from '../../utils/session';
import { spotifyAuthorizeUrl } from '../../utils/spotify';

export default defineEventHandler((event) => {
  const { clientId } = requireProviderConfig(event, 'spotify');
  const state = createOAuthState(event, 'spotify');
  const redirectUri = `${getAppUrl(event)}/api/auth/spotify/callback`;
  return sendRedirect(event, spotifyAuthorizeUrl(clientId, redirectUri, state), 302);
});
