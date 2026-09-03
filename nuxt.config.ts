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
    cronSecret: '',
    storagePath: '.data/spotislack.json',
    public: {
      appUrl: 'http://localhost:3000',
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
      ],
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
});
