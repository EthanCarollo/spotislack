import type { SyncResponse } from '../../shared/types';
import { requireSessionUser } from '../utils/session';
import { syncUser } from '../utils/sync';

export default defineEventHandler(async (event): Promise<SyncResponse> => {
  const user = await requireSessionUser(event);
  return syncUser(event, user.id);
});
