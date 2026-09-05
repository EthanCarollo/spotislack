import { createError, getRequestURL, type H3Event } from 'h3';

export function getSessionSecret(event: H3Event): string {
  const config = useRuntimeConfig(event);
  const secret = String(config.sessionSecret || '');
  if (!secret || secret.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_SESSION_SECRET doit contenir au moins 32 caractères.',
    });
  }
  return secret;
}

export function getTokenEncryptionKey(event: H3Event): string {
  const config = useRuntimeConfig(event);
  const key = String(config.tokenEncryptionKey || '');
  if (!key || key.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_TOKEN_ENCRYPTION_KEY doit contenir au moins 32 caractères.',
    });
  }
  return key;
}

export function getAppUrl(event: H3Event): string {
  const config = useRuntimeConfig(event);
  const configuredUrl = String(config.public.appUrl || '').trim();
  if (configuredUrl) {
    const normalizedUrl = configuredUrl.replace(/\/$/, '');
    if (isProduction() && !normalizedUrl.startsWith('https://')) {
      throw createError({
        statusCode: 500,
        statusMessage: 'NUXT_PUBLIC_APP_URL doit utiliser HTTPS en production.',
      });
    }
    return normalizedUrl;
  }

  if (isProduction()) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_PUBLIC_APP_URL est obligatoire en production.',
    });
  }

  const requestUrl = getRequestURL(event);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

export function requireProviderConfig(
  event: H3Event,
  provider: 'spotify' | 'slack',
): { clientId: string; clientSecret: string } {
  const config = useRuntimeConfig(event);
  const clientId = String(config[`${provider}ClientId`] || '');
  const clientSecret = String(config[`${provider}ClientSecret`] || '');
  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: `La configuration ${provider} est incomplète.`,
    });
  }
  return { clientId, clientSecret };
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
