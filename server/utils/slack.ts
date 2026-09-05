import type { H3Event } from 'h3';
import { requireProviderConfig } from './config';
import { IntegrationError } from './errors';
import { providerFetch } from './provider-fetch';

const SLACK_AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_API_URL = 'https://slack.com/api';
export const SLACK_USER_SCOPES = ['users.profile:read', 'users.profile:write'];

interface SlackOAuthResponse {
  ok?: boolean;
  error?: string;
  access_token?: string;
  authed_user?: { id?: string; access_token?: string; scope?: string };
  team?: { id?: string; name?: string };
}

export interface SlackProfile {
  statusText: string;
  statusEmoji: string;
}

export function slackAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const url = new URL(SLACK_AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('user_scope', SLACK_USER_SCOPES.join(','));
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeSlackCode(
  event: H3Event,
  code: string,
  redirectUri: string,
): Promise<SlackOAuthResponse> {
  const { clientId, clientSecret } = requireProviderConfig(event, 'slack');
  const response = await providerFetch(`${SLACK_API_URL}/oauth.v2.access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });
  const payload = await response.json().catch(() => ({})) as SlackOAuthResponse;
  if (!response.ok || !payload.ok || !payload.authed_user?.access_token) {
    throw new IntegrationError('slack', payload.error || 'oauth_failed', 'Slack OAuth failed', response.status || 502);
  }
  return payload;
}

async function slackApi<T>(
  method: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await providerFetch(`${SLACK_API_URL}/${method}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({})) as T & { ok?: boolean; error?: string };
  if (!response.ok || payload.ok === false) {
    throw new IntegrationError(
      'slack',
      payload.error || (response.status === 429 ? 'rate_limited' : 'api_failed'),
      'Slack API request failed',
      response.status || 502,
    );
  }
  return payload;
}

export async function getSlackProfile(accessToken: string): Promise<SlackProfile> {
  const payload = await slackApi<{ ok?: boolean; profile?: { status_text?: string; status_emoji?: string } }>(
    'users.profile.get',
    accessToken,
  );
  return {
    statusText: payload.profile?.status_text || '',
    statusEmoji: payload.profile?.status_emoji || '',
  };
}

export async function setSlackStatus(
  accessToken: string,
  status: SlackProfile,
): Promise<void> {
  await slackApi('users.profile.set', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      profile: {
        status_text: status.statusText,
        status_emoji: status.statusEmoji,
        status_expiration: 0,
      },
    }),
  });
}

export async function clearSlackStatus(accessToken: string): Promise<void> {
  await setSlackStatus(accessToken, { statusText: '', statusEmoji: '' });
}
