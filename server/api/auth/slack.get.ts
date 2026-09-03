import { sendRedirect } from 'h3';
import { getAppUrl, requireProviderConfig } from '../../utils/config';
import { createOAuthState } from '../../utils/session';
import { slackAuthorizeUrl } from '../../utils/slack';

export default defineEventHandler((event) => {
  const { clientId } = requireProviderConfig(event, 'slack');
  const state = createOAuthState(event, 'slack');
  const redirectUri = `${getAppUrl(event)}/api/auth/slack/callback`;
  return sendRedirect(event, slackAuthorizeUrl(clientId, redirectUri, state), 302);
});
