import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { H3Event } from 'h3';
import type { TrackSnapshot, AppliedStatus } from '../../shared/types';
import { getSessionSecret } from './config';
import { decryptSecret, encryptSecret } from './security';

export interface SpotifyConnection {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshTokenExpiresAt: number;
  scope: string;
  reauthRequired?: boolean;
}

export interface SlackConnection {
  accessToken: string;
  userId: string;
  teamId: string;
  teamName: string;
  scope: string;
}

export interface UserRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  spotify?: SpotifyConnection;
  slack?: SlackConnection;
  sync: {
    enabled: boolean;
    manualOverride: boolean;
    lastTrack: TrackSnapshot | null;
    lastTrackKey?: string;
    lastApplied?: AppliedStatus;
    lastSyncedAt?: number;
    lastError?: string;
  };
}

interface PersistedUser extends Omit<UserRecord, 'spotify' | 'slack'> {
  spotify?: Omit<SpotifyConnection, 'accessToken' | 'refreshToken'> & {
    accessToken: string;
    refreshToken: string;
  };
  slack?: Omit<SlackConnection, 'accessToken'> & { accessToken: string };
}

interface Database {
  users: Record<string, PersistedUser>;
}

const locks = new Map<string, Promise<void>>();

function storagePath(event: H3Event): string {
  const config = useRuntimeConfig(event);
  const configuredPath = String(config.storagePath || '.data/spotislack.json');
  return isAbsolute(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath);
}

async function readDatabase(path: string): Promise<Database> {
  try {
    const content = await readFile(path, 'utf8');
    const parsed = JSON.parse(content) as Partial<Database>;
    return { users: parsed.users ?? {} };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { users: {} };
    }
    throw error;
  }
}

async function writeDatabase(path: string, database: Database): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(database, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(temporaryPath, path);
}

async function withDatabaseLock<T>(path: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(path) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolveRelease) => {
    release = resolveRelease;
  });
  const queued = previous.then(() => current);
  locks.set(path, queued);
  await previous;
  try {
    return await task();
  } finally {
    release();
    if (locks.get(path) === queued) {
      locks.delete(path);
    }
  }
}

function encodeUser(user: UserRecord, secret: string): PersistedUser {
  return {
    id: user.id,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    sync: user.sync,
    spotify: user.spotify
      ? {
          ...user.spotify,
          accessToken: encryptSecret(user.spotify.accessToken, secret),
          refreshToken: encryptSecret(user.spotify.refreshToken, secret),
        }
      : undefined,
    slack: user.slack
      ? {
          ...user.slack,
          accessToken: encryptSecret(user.slack.accessToken, secret),
        }
      : undefined,
  };
}

function decodeUser(user: PersistedUser, secret: string): UserRecord {
  return {
    ...user,
    spotify: user.spotify
      ? {
          ...user.spotify,
          accessToken: decryptSecret(user.spotify.accessToken, secret),
          refreshToken: decryptSecret(user.spotify.refreshToken, secret),
        }
      : undefined,
    slack: user.slack
      ? {
          ...user.slack,
          accessToken: decryptSecret(user.slack.accessToken, secret),
        }
      : undefined,
  };
}

export function createUser(): UserRecord {
  const now = Date.now();
  return {
    id: randomBytes(18).toString('base64url'),
    createdAt: now,
    updatedAt: now,
    sync: {
      enabled: true,
      manualOverride: false,
      lastTrack: null,
    },
  };
}

export async function getUser(
  event: H3Event,
  userId: string,
): Promise<UserRecord | null> {
  const path = storagePath(event);
  const database = await readDatabase(path);
  const persistedUser = database.users[userId];
  if (!persistedUser) {
    return null;
  }
  return decodeUser(persistedUser, getSessionSecret(event));
}

export async function listUsers(event: H3Event): Promise<UserRecord[]> {
  const path = storagePath(event);
  const database = await readDatabase(path);
  const secret = getSessionSecret(event);
  return Object.values(database.users).map((user) => decodeUser(user, secret));
}

export async function saveUser(
  event: H3Event,
  user: UserRecord,
): Promise<void> {
  const path = storagePath(event);
  const encodedUser = encodeUser(user, getSessionSecret(event));
  await withDatabaseLock(path, async () => {
    const database = await readDatabase(path);
    database.users[user.id] = encodedUser;
    await writeDatabase(path, database);
  });
}

export async function deleteUser(
  event: H3Event,
  userId: string,
): Promise<void> {
  const path = storagePath(event);
  await withDatabaseLock(path, async () => {
    const database = await readDatabase(path);
    delete database.users[userId];
    await writeDatabase(path, database);
  });
}
