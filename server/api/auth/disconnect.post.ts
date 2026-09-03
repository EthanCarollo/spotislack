import { createError, readBody } from 'h3';
import { clearSlackStatus, getSlackProfile } from '../../utils/slack';
import { getSessionUser, clearSessionUser } from '../../utils/session';
import { deleteUser, saveUser } from '../../utils/store';

export default defineEventHandler(async (event) => {
  const body = await readBody<{ provider?: unknown }>(event);
  const provider = body?.provider;
  if (provider !== 'spotify' && provider !== 'slack') {
    throw createError({ statusCode: 400, statusMessage: 'Provider invalide.' });
  }

  const user = await getSessionUser(event);
  if (!user) {
    return { ok: true };
  }

  if (provider === 'slack' && user.slack && user.sync.lastApplied) {
    try {
      const current = await getSlackProfile(user.slack.accessToken);
      if (current.statusText === user.sync.lastApplied.text && current.statusEmoji === user.sync.lastApplied.emoji) {
        await clearSlackStatus(user.slack.accessToken);
      }
    } catch {
      // The local credential is removed even if Slack is temporarily unavailable.
    }
  }

  if (provider === 'spotify') {
    user.spotify = undefined;
  } else {
    user.slack = undefined;
    user.sync.lastApplied = undefined;
    user.sync.manualOverride = false;
  }
  user.sync.lastTrack = null;
  user.sync.lastTrackKey = undefined;
  user.updatedAt = Date.now();

  if (!user.spotify && !user.slack) {
    await deleteUser(event, user.id);
    clearSessionUser(event);
  } else {
    await saveUser(event, user);
  }
  return { ok: true };
});
