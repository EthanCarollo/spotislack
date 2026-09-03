import { createError, getHeader } from 'h3';
import { syncAllUsers } from '../../utils/sync';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const cronSecret = String(config.cronSecret || '');
  const authorization = getHeader(event, 'authorization');
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Cron secret invalide.' });
  }

  const results = await syncAllUsers(event);
  return {
    ok: results.every(({ result }) => result.ok),
    synced: results.length,
    results: results.map(({ userId, result }) => ({
      userId,
      ok: result.ok,
      action: result.action,
      message: result.message,
    })),
  };
});
