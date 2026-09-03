import { getQuery, sendRedirect, type H3Event } from 'h3';
import { getAppUrl } from '../../../utils/config';
import { queryString } from '../../../utils/query';
import { consumeOAuthState, getOrCreateSessionUser } from '../../../utils/session';
import { exchangeSlackCode } from '../../../utils/slack';
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
    return homeRedirect(event, 'error', 'slack_access_denied');
  }
  if (!consumeOAuthState(event, 'slack', state) || !code) {
    return homeRedirect(event, 'error', 'slack_state_mismatch');
  }

  try {
    const redirectUri = `${getAppUrl(event)}/api/auth/slack/callback`;
    const token = await exchangeSlackCode(event, code, redirectUri);
    const user = await getOrCreateSessionUser(event);
    user.slack = {
      accessToken: token.authed_user!.access_token!,
      userId: token.authed_user!.id || '',
      teamId: token.team?.id || '',
      teamName: token.team?.name || 'Workspace Slack',
      scope: token.authed_user!.scope || '',
    };
    user.sync.manualOverride = false;
    user.updatedAt = Date.now();
    await saveUser(event, user);
    return homeRedirect(event, 'connected', 'slack');
  } catch {
    return homeRedirect(event, 'error', 'slack_connection_failed');
  }
});
