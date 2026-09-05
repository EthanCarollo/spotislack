export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    spotifyClientId: '',
    spotifyClientSecret: '',
    slackClientId: '',
    slackClientSecret: '',
    sessionSecret: '',
    tokenEncryptionKey: '',
    cronSecret: '',
    storagePath: '.data/spotislack.json',
    public: {
      appUrl: '',
    },
  },
  app: {
    head: {
      title: 'Spotislack — Ton Spotify dans Slack',
      meta: [
        {
          name: 'description',
          content: 'Synchronise automatiquement ton morceau Spotify avec ton statut Slack.',
        },
        { name: 'theme-color', content: '#0b0d12' },
        { property: 'og:title', content: 'Spotislack — Ton Spotify dans Slack' },
        { property: 'og:description', content: 'Synchronise automatiquement ton morceau Spotify avec ton statut Slack.' },
        { property: 'og:image', content: '/brand/spotislack-banner.svg' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/brand/spotislack-logo.svg' }],
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
});
