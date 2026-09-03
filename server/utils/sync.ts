import type { H3Event } from 'h3';
import type { SyncResponse, TrackSnapshot, AppliedStatus } from '../../shared/types';
import { getPublicErrorMessage, IntegrationError } from './errors';
import { getCurrentlyPlaying, playbackKey } from './spotify';
import { clearSlackStatus, getSlackProfile, setSlackStatus, type SlackProfile } from './slack';
import { getUser, listUsers, saveUser, type UserRecord } from './store';

const MAX_STATUS_TEXT_LENGTH = 100;

function truncate(value: string, maxLength: number): string {
  const characters = Array.from(value.trim());
  if (characters.length <= maxLength) {
    return characters.join('');
  }
  return `${characters.slice(0, maxLength - 1).join('')}…`;
}

export function desiredSlackStatus(track: TrackSnapshot | null): SlackProfile | null {
  if (!track) {
    return null;
  }

  const prefix = track.kind === 'episode' ? '🎙️' : track.isPlaying ? '🎧' : '⏸️';
  const emoji = track.kind === 'episode' ? ':studio_microphone:' : track.isPlaying ? ':headphones:' : ':pause_button:';
  return {
    statusText: truncate(`${prefix} ${track.title} — ${track.artist}`, MAX_STATUS_TEXT_LENGTH),
    statusEmoji: emoji,
  };
}

function sameStatus(left: SlackProfile | AppliedStatus | undefined, right: SlackProfile): boolean {
  if (!left) {
    return false;
  }
  const text = 'statusText' in left ? left.statusText : left.text;
  const emoji = 'statusEmoji' in left ? left.statusEmoji : left.emoji;
  return text === right.statusText && emoji === right.statusEmoji;
}

function publicSyncState(user: UserRecord) {
  return {
    enabled: user.sync.enabled,
    manualOverride: user.sync.manualOverride,
    lastSyncedAt: user.sync.lastSyncedAt,
    lastError: user.sync.lastError,
  };
}

function response(
  user: UserRecord,
  action: SyncResponse['action'],
  message: string,
  ok: boolean,
): SyncResponse {
  return {
    ok,
    action,
    message,
    track: user.sync.lastTrack,
    sync: publicSyncState(user),
  };
}

function recordSuccess(user: UserRecord, track: TrackSnapshot | null, applied?: AppliedStatus): void {
  user.sync.lastTrack = track;
  user.sync.lastTrackKey = playbackKey(track);
  user.sync.lastApplied = applied;
  user.sync.lastSyncedAt = Date.now();
  user.sync.lastError = undefined;
  user.updatedAt = Date.now();
}

export async function syncUser(
  event: H3Event,
  userId: string,
  options: { force?: boolean } = {},
): Promise<SyncResponse> {
  const user = await getUser(event, userId);
  if (!user) {
    throw new IntegrationError('spotify', 'not_connected', 'User not found', 401);
  }
  if (!user.sync.enabled) {
    return response(user, 'skipped', 'Synchronisation en pause.', true);
  }
  if (!user.spotify || !user.slack) {
    user.sync.lastError = 'Connecte Spotify et Slack pour synchroniser.';
    await saveUser(event, user);
    return response(user, 'error', user.sync.lastError, false);
  }

  try {
    const track = await getCurrentlyPlaying(event, user);
    const desired = desiredSlackStatus(track);
    const current = await getSlackProfile(user.slack.accessToken);
    const force = Boolean(options.force);
    const currentStatus: SlackProfile = { statusText: current.statusText, statusEmoji: current.statusEmoji };

    if (!force && user.sync.manualOverride) {
      return response(user, 'skipped', getPublicErrorMessage(new IntegrationError('slack', 'manual_override', 'Manual override')), true);
    }

    if (!force && user.sync.lastApplied && !sameStatus(user.sync.lastApplied, currentStatus)) {
      user.sync.manualOverride = true;
      user.sync.lastError = undefined;
      user.updatedAt = Date.now();
      await saveUser(event, user);
      return response(user, 'skipped', getPublicErrorMessage(new IntegrationError('slack', 'manual_override', 'Manual override')), true);
    }

    if (!force && !user.sync.lastApplied && (current.statusText || current.statusEmoji)) {
      user.sync.manualOverride = true;
      user.updatedAt = Date.now();
      await saveUser(event, user);
      return response(user, 'skipped', getPublicErrorMessage(new IntegrationError('slack', 'manual_override', 'Manual override')), true);
    }

    if (!desired) {
      if (!user.sync.lastApplied && !current.statusText && !current.statusEmoji) {
        recordSuccess(user, null);
        await saveUser(event, user);
        return response(user, 'unchanged', 'Aucun contenu Spotify en lecture.', true);
      }
      if (!sameStatus(user.sync.lastApplied, currentStatus) && !force) {
        user.sync.manualOverride = true;
        await saveUser(event, user);
        return response(user, 'skipped', getPublicErrorMessage(new IntegrationError('slack', 'manual_override', 'Manual override')), true);
      }
      await clearSlackStatus(user.slack.accessToken);
      recordSuccess(user, null);
      await saveUser(event, user);
      return response(user, 'cleared', 'Statut Slack effacé : rien n’est en lecture.', true);
    }

    if (sameStatus(currentStatus, desired)) {
      recordSuccess(user, track, { text: desired.statusText, emoji: desired.statusEmoji });
      await saveUser(event, user);
      return response(user, 'unchanged', 'Statut déjà à jour.', true);
    }

    await setSlackStatus(user.slack.accessToken, desired);
    recordSuccess(user, track, { text: desired.statusText, emoji: desired.statusEmoji });
    await saveUser(event, user);
    return response(user, 'updated', 'Statut Slack mis à jour.', true);
  } catch (error: unknown) {
    user.sync.lastError = getPublicErrorMessage(error);
    user.updatedAt = Date.now();
    await saveUser(event, user);
    if (error instanceof IntegrationError && error.code === 'spotify_reauth_required') {
      return response(user, 'error', user.sync.lastError, false);
    }
    return response(user, 'error', user.sync.lastError, false);
  }
}

export async function syncAllUsers(event: H3Event): Promise<Array<{ userId: string; result: SyncResponse }>> {
  const users = await listUsers(event);
  const results: Array<{ userId: string; result: SyncResponse }> = [];
  for (const user of users) {
    if (!user.sync.enabled || !user.spotify || !user.slack) {
      continue;
    }
    results.push({ userId: user.id, result: await syncUser(event, user.id) });
  }
  return results;
}
