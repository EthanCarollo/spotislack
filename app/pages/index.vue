<script setup lang="ts">
import type { AuthStatusResponse, SyncResponse } from '../../shared/types';

const defaultStatus: AuthStatusResponse = {
  authenticated: false,
  spotify: { status: 'disconnected' },
  slack: { status: 'disconnected' },
  sync: { enabled: false, manualOverride: false },
  track: null,
};

const status = ref<AuthStatusResponse>({ ...defaultStatus });
const loading = ref(true);
const busy = ref(false);
const statusError = ref(false);
const notice = ref<{ kind: 'error' | 'success'; text: string } | null>(null);
let pollingTimer: ReturnType<typeof setInterval> | undefined;

const route = useRoute();

const authenticated = computed(() => status.value.authenticated);
const spotifyConnected = computed(() => status.value.spotify.status === 'connected');
const slackConnected = computed(() => status.value.slack.status === 'connected');
const canSync = computed(() => authenticated.value && spotifyConnected.value && slackConnected.value);

const errorMessages: Record<string, string> = {
  spotify_access_denied: 'La connexion Spotify a été annulée.',
  spotify_state_mismatch: 'La connexion Spotify a expiré. Réessaie.',
  spotify_missing_refresh_token: 'Spotify n’a pas fourni de refresh token. Réessaie la connexion.',
  spotify_connection_failed: 'Impossible de connecter Spotify pour le moment.',
  slack_access_denied: 'La connexion Slack a été annulée.',
  slack_state_mismatch: 'La connexion Slack a expiré. Réessaie.',
  slack_connection_failed: 'Impossible de connecter Slack pour le moment.',
};

async function refreshStatus(): Promise<void> {
  try {
    const nextStatus = await $fetch<AuthStatusResponse>('/api/auth/status');
    status.value = nextStatus;
    statusError.value = false;
  } catch {
    statusError.value = true;
  } finally {
    loading.value = false;
  }
}

function applySyncResult(result: SyncResponse): void {
  status.value = {
    ...status.value,
    sync: result.sync,
    track: result.track,
  };
  if (result.message) {
    notice.value = {
      kind: result.ok && !result.sync.manualOverride ? 'success' : 'error',
      text: result.message,
    };
  }
}

async function syncNow(silent = false): Promise<void> {
  if (busy.value || !canSync.value) {
    return;
  }
  busy.value = true;
  try {
    const result = await $fetch<SyncResponse>('/api/sync', { method: 'POST' });
    applySyncResult(result);
    if (silent && result.action === 'unchanged') {
      notice.value = null;
    }
  } catch {
    if (!silent) {
      notice.value = { kind: 'error', text: 'La synchronisation a échoué. Réessaie dans un instant.' };
    }
  } finally {
    busy.value = false;
  }
}

async function toggleSync(enabled: boolean): Promise<void> {
  if (busy.value) {
    return;
  }
  busy.value = true;
  try {
    const result = await $fetch<SyncResponse>('/api/sync/toggle', {
      method: 'POST',
      body: { enabled },
    });
    applySyncResult(result);
  } catch {
    notice.value = { kind: 'error', text: 'Impossible de modifier la synchronisation.' };
  } finally {
    busy.value = false;
  }
}

async function disconnect(provider: 'spotify' | 'slack'): Promise<void> {
  const providerLabel = provider === 'spotify' ? 'Spotify' : 'Slack';
  if (!window.confirm(`Déconnecter ${providerLabel} de Spotislack ?`)) {
    return;
  }
  busy.value = true;
  try {
    await $fetch('/api/auth/disconnect', { method: 'POST', body: { provider } });
    await refreshStatus();
    notice.value = { kind: 'success', text: `${providerLabel} a été déconnecté.` };
  } catch {
    notice.value = { kind: 'error', text: `Impossible de déconnecter ${providerLabel}.` };
  } finally {
    busy.value = false;
  }
}

async function logout(): Promise<void> {
  await $fetch('/api/auth/logout', { method: 'POST' });
  status.value = { ...defaultStatus };
  notice.value = { kind: 'success', text: 'Session fermée sur cet appareil.' };
}

function connectionLabel(provider: AuthStatusResponse['spotify']): string {
  if (provider.status === 'connected') {
    return 'Connecté';
  }
  if (provider.status === 'reauth_required') {
    return 'Reconnexion nécessaire';
  }
  return 'Non connecté';
}

function statusDotClass(provider: AuthStatusResponse['spotify']): string {
  return provider.status === 'connected' ? 'connected' : provider.status === 'reauth_required' ? 'warning' : '';
}

function formatLastSync(value?: number): string {
  if (!value) {
    return 'Jamais synchronisé';
  }
  return `Mis à jour à ${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(value)}`;
}

onMounted(async () => {
  await refreshStatus();

  const connected = typeof route.query.connected === 'string' ? route.query.connected : undefined;
  const error = typeof route.query.error === 'string' ? route.query.error : undefined;
  if (connected) {
    notice.value = {
      kind: 'success',
      text: `${connected === 'spotify' ? 'Spotify' : 'Slack'} est connecté. Connecte l’autre service pour commencer.`,
    };
    await navigateTo('/', { replace: true });
  } else if (error) {
    notice.value = { kind: 'error', text: errorMessages[error] || 'La connexion a échoué.' };
    await navigateTo('/', { replace: true });
  }

  pollingTimer = setInterval(() => {
    void syncNow(true);
  }, 45_000);
});

onBeforeUnmount(() => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
  }
});
</script>

<template>
  <div class="page-shell">
    <header class="site-header">
      <NuxtLink class="brand" to="/" aria-label="Spotislack accueil">
        <img class="brand-mark" src="/brand/spotislack-logo.svg" alt="" width="30" height="30" />
        Spotislack
      </NuxtLink>
      <span class="header-note">Spotify dans Slack, sans distraction.</span>
    </header>

    <main>
      <section class="hero">
        <div>
          <p class="eyebrow">Spotify × Slack</p>
          <h1>La musique que tu écoutes, <span>dans ton statut.</span></h1>
          <p class="hero-copy">
            Spotislack garde ton statut Slack synchronisé avec ton écoute Spotify. Une connexion, puis ça suit tout seul.
          </p>

          <div v-if="!authenticated" class="hero-actions">
            <a class="button button-primary" href="/api/auth/spotify">
              <span aria-hidden="true">●</span>
              Connecter Spotify
            </a>
            <a class="button button-secondary" href="/api/auth/slack">
              <span aria-hidden="true">✣</span>
              Connecter Slack
            </a>
          </div>
          <div v-else class="hero-actions">
            <button class="button button-primary" :disabled="busy || !canSync" @click="syncNow()">
              <span aria-hidden="true">↻</span>
              {{ busy ? 'Synchronisation…' : 'Synchroniser maintenant' }}
            </button>
            <button class="button button-secondary" :disabled="busy" @click="logout">
              Fermer la session
            </button>
          </div>

          <p class="fine-print">
            Gratuit pour un usage personnel · jusqu’à 5 utilisateurs en Development Mode Spotify
          </p>
        </div>

        <div class="dashboard-card" aria-label="Aperçu du tableau de bord Spotislack">
          <div class="dashboard-inner">
            <div class="card-topbar">
              <div class="window-dots" aria-hidden="true"><i /><i /><i /></div>
              <span class="card-label">Synchronisation</span>
            </div>

            <div class="connection-list">
              <div class="connection-row">
                <div class="connection-main">
                  <div class="provider-icon spotify" aria-hidden="true">●</div>
                  <div class="connection-copy">
                    <div class="connection-name">
                      Spotify
                      <span class="status-dot" :class="statusDotClass(status.spotify)" />
                    </div>
                    <div class="connection-meta">{{ connectionLabel(status.spotify) }}</div>
                  </div>
                </div>
                <a v-if="!spotifyConnected || status.spotify.status === 'reauth_required'" class="provider-button" href="/api/auth/spotify">
                  {{ status.spotify.status === 'reauth_required' ? 'Reconnecter' : 'Connecter' }}
                </a>
                <button v-else class="provider-button" :disabled="busy" @click="disconnect('spotify')">Déconnecter</button>
              </div>

              <div class="connection-row">
                <div class="connection-main">
                  <div class="provider-icon slack" aria-hidden="true">✣</div>
                  <div class="connection-copy">
                    <div class="connection-name">
                      Slack
                      <span class="status-dot" :class="statusDotClass(status.slack)" />
                    </div>
                    <div class="connection-meta">{{ status.slack.detail || connectionLabel(status.slack) }}</div>
                  </div>
                </div>
                <a v-if="!slackConnected" class="provider-button" href="/api/auth/slack">Connecter</a>
                <button v-else class="provider-button" :disabled="busy" @click="disconnect('slack')">Déconnecter</button>
              </div>
            </div>

            <div class="player-panel">
              <div class="player-heading">
                <span>Statut en direct</span>
                <span v-if="status.track">{{ status.track.isPlaying ? 'En lecture' : 'En pause' }}</span>
                <span v-else>En attente</span>
              </div>
              <a v-if="status.track" class="track-preview" :href="status.track.spotifyUrl" target="_blank" rel="noreferrer">
                <div class="album-art">
                  <img v-if="status.track.imageUrl" :src="status.track.imageUrl" alt="" />
                  <span v-else aria-hidden="true">♪</span>
                </div>
                <div class="track-info">
                  <div class="track-title">{{ status.track.title }}</div>
                  <div class="track-artist">{{ status.track.artist }} · {{ status.track.deviceName || 'Spotify' }}</div>
                </div>
              </a>
              <p v-else class="empty-player">
                {{ canSync ? 'Lance un morceau, puis synchronise pour le voir apparaître ici.' : 'Connecte Spotify et Slack pour commencer.' }}
              </p>
            </div>

            <div v-if="authenticated" class="dashboard-footer">
              <span class="toggle-line">
                <button class="toggle" :class="{ active: status.sync.enabled }" :aria-pressed="status.sync.enabled" aria-label="Activer ou mettre en pause la synchronisation" @click="toggleSync(!status.sync.enabled)" />
                {{ status.sync.enabled ? 'Synchronisation active' : 'Synchronisation en pause' }}
              </span>
              <button class="button button-ghost" :disabled="busy || !canSync" @click="syncNow()">{{ formatLastSync(status.sync.lastSyncedAt) }}</button>
            </div>
          </div>
        </div>
      </section>

      <div v-if="notice" class="notice" :class="{ success: notice.kind === 'success' }" role="status">
        {{ notice.text }}
        <button v-if="status.sync.manualOverride" class="text-link" style="float: right; border: 0; padding: 0; background: none; cursor: pointer;" @click="toggleSync(true)">
          Reprendre la main
        </button>
      </div>

      <div v-if="statusError" class="setup-panel">
        <h2>Configuration serveur nécessaire</h2>
        <p>
          Copie <code>.env.example</code> vers <code>.env</code>, renseigne les identifiants Spotify/Slack et les trois secrets d’au moins 32 caractères, puis relance le serveur Nuxt.
        </p>
      </div>

      <section class="feature-strip" aria-label="Fonctionnalités">
        <article class="feature">
          <div class="feature-icon" aria-hidden="true">◌</div>
          <h2>Ça suit le morceau</h2>
          <p>Le titre, l’artiste et l’état lecture/pause se reflètent dans ton statut personnalisé Slack.</p>
        </article>
        <article class="feature">
          <div class="feature-icon" aria-hidden="true">⌁</div>
          <h2>Respecte ton statut</h2>
          <p>Si tu modifies ton statut Slack à la main, Spotislack s’arrête pour ne pas l’écraser.</p>
        </article>
        <article class="feature">
          <div class="feature-icon" aria-hidden="true">↗</div>
          <h2>Simple à héberger</h2>
          <p>Un serveur Nuxt Node et un cron toutes les 60 secondes suffisent pour une petite équipe.</p>
        </article>
      </section>
    </main>
  </div>
</template>
