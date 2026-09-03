import type { AuthStatusResponse } from '../../../shared/types';
import { getSessionUser } from '../../utils/session';

export default defineEventHandler(async (event): Promise<AuthStatusResponse> => {
  const user = await getSessionUser(event);
  if (!user) {
    return {
      authenticated: false,
      spotify: { status: 'disconnected' },
      slack: { status: 'disconnected' },
      sync: { enabled: false, manualOverride: false },
      track: null,
    };
  }

  return {
    authenticated: true,
    spotify: {
      status: user.spotify?.reauthRequired ? 'reauth_required' : user.spotify ? 'connected' : 'disconnected',
    },
    slack: {
      status: user.slack ? 'connected' : 'disconnected',
      detail: user.slack?.teamName,
    },
    sync: {
      enabled: user.sync.enabled,
      manualOverride: user.sync.manualOverride,
      lastSyncedAt: user.sync.lastSyncedAt,
      lastError: user.sync.lastError,
    },
    track: user.sync.lastTrack,
  };
});
