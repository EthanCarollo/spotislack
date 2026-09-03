import { randomBytes } from 'node:crypto';
import { createError, deleteCookie, getCookie, setCookie, type H3Event } from 'h3';
import { getSessionSecret, isProduction } from './config';
import { createUser, getUser, type UserRecord } from './store';
import { signValue, verifySignedValue } from './security';

const SESSION_COOKIE = 'spotislack_session';
const OAUTH_COOKIE_PREFIX = 'spotislack_oauth_';
const OAUTH_TTL_SECONDS = 10 * 60;

function cookieOptions(event: H3Event, maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction(),
    path: '/',
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

export function setSessionUser(event: H3Event, userId: string): void {
  setCookie(event, SESSION_COOKIE, signValue(userId, getSessionSecret(event)), cookieOptions(event));
}

export function clearSessionUser(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, cookieOptions(event));
}

export function getSessionUserId(event: H3Event): string | null {
  const value = verifySignedValue(getCookie(event, SESSION_COOKIE), getSessionSecret(event));
  return value || null;
}

export async function getSessionUser(event: H3Event): Promise<UserRecord | null> {
  const userId = getSessionUserId(event);
  return userId ? getUser(event, userId) : null;
}

export async function requireSessionUser(event: H3Event): Promise<UserRecord> {
  const user = await getSessionUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Session utilisateur introuvable.' });
  }
  return user;
}

export function createOAuthState(
  event: H3Event,
  provider: 'spotify' | 'slack',
): string {
  const state = randomBytes(24).toString('base64url');
  const payload = `${provider}|${Date.now()}|${state}`;
  setCookie(
    event,
    `${OAUTH_COOKIE_PREFIX}${provider}`,
    signValue(payload, getSessionSecret(event)),
    cookieOptions(event, OAUTH_TTL_SECONDS),
  );
  return state;
}

export function consumeOAuthState(
  event: H3Event,
  provider: 'spotify' | 'slack',
  receivedState: string | undefined,
): boolean {
  const cookieName = `${OAUTH_COOKIE_PREFIX}${provider}`;
  const payload = verifySignedValue(getCookie(event, cookieName), getSessionSecret(event));
  deleteCookie(event, cookieName, cookieOptions(event));
  if (!payload || !receivedState) {
    return false;
  }

  const [payloadProvider, timestamp, state] = payload.split('|');
  return (
    payloadProvider === provider &&
    state === receivedState &&
    Number.isFinite(Number(timestamp)) &&
    Date.now() - Number(timestamp) <= OAUTH_TTL_SECONDS * 1000
  );
}

export async function getOrCreateSessionUser(
  event: H3Event,
): Promise<UserRecord> {
  const existingUser = await getSessionUser(event);
  if (existingUser) {
    return existingUser;
  }

  const user = createUser();
  setSessionUser(event, user.id);
  return user;
}
