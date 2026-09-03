import { createError, getRequestURL } from 'h3';

export function getSessionSecret(event: Parameters<typeof useRuntimeConfig>[0]): string {
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

export function getAppUrl(event: Parameters<typeof useRuntimeConfig>[0]): string {
  const config = useRuntimeConfig(event);
  const configuredUrl = String(config.public.appUrl || '').trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  const requestUrl = getRequestURL(event);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

export function requireProviderConfig(
  event: Parameters<typeof useRuntimeConfig>[0],
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
