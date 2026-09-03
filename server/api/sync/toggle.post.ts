import { readBody } from 'h3';
import type { SyncResponse } from '../../../shared/types';
import { requireSessionUser } from '../../utils/session';
import { saveUser } from '../../utils/store';
import { syncUser } from '../../utils/sync';

export default defineEventHandler(async (event): Promise<SyncResponse> => {
  const body = await readBody<{ enabled?: unknown }>(event);
  const user = await requireSessionUser(event);
  const enabled = body?.enabled === true;
  user.sync.enabled = enabled;
  user.sync.lastError = undefined;
  if (!enabled) {
    await saveUser(event, user);
    return {
      ok: true,
      action: 'skipped',
      message: 'Synchronisation mise en pause.',
      track: user.sync.lastTrack,
      sync: {
        enabled: false,
        manualOverride: user.sync.manualOverride,
        lastSyncedAt: user.sync.lastSyncedAt,
      },
    };
  }

  user.sync.manualOverride = false;
  await saveUser(event, user);
  return syncUser(event, user.id, { force: true });
});
