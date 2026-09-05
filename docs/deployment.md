# Déploiement

## Modèle recommandé

Déploie le build Nuxt comme un serveur Node unique avec un volume persistant pour `.data` :

```bash
npm ci
npm run build
node .output/server/index.mjs
```

Variables indispensables :

```dotenv
NUXT_PUBLIC_APP_URL=https://status.example.com
NUXT_SPOTIFY_CLIENT_ID=
NUXT_SPOTIFY_CLIENT_SECRET=
NUXT_SLACK_CLIENT_ID=
NUXT_SLACK_CLIENT_SECRET=
NUXT_SESSION_SECRET=
NUXT_TOKEN_ENCRYPTION_KEY=
NUXT_CRON_SECRET=
NUXT_STORAGE_PATH=/var/lib/spotislack/spotislack.json
```

`NUXT_PUBLIC_APP_URL` doit être HTTPS en production. `NUXT_STORAGE_PATH` doit être sur un volume sauvegardé et accessible en lecture/écriture par le processus Node.

## Reverse proxy

Place le serveur derrière un reverse proxy HTTPS (Caddy, Nginx, Traefik ou équivalent). Le proxy doit transmettre les requêtes vers le port interne du serveur Nuxt et conserver les headers `Host` et `X-Forwarded-Proto` utiles à l’observabilité.

Les callbacks configurés chez Spotify et Slack doivent utiliser le domaine HTTPS public, jamais l’URL interne du processus Node.

## Process manager

Avec PM2 :

```bash
pm2 start .output/server/index.mjs --name spotislack
pm2 save
```

Le store doit survivre à un redémarrage et ne doit pas être placé dans un répertoire temporaire.

## Cron

Planifie une requête toutes les 60 secondes :

```bash
curl --fail-with-body \
  -H "Authorization: Bearer ${NUXT_CRON_SECRET}" \
  https://status.example.com/api/cron/sync
```

Sur un hébergeur avec cron HTTP, configure le même header secret dans le job. Le cron est utile même lorsque personne ne garde le dashboard ouvert.

## Vérification après déploiement

```bash
curl --fail https://status.example.com/api/health
```

Résultat attendu :

```json
{ "ok": true, "service": "spotislack" }
```

Ensuite, teste les deux boutons de connexion avec un compte Spotify autorisé et le workspace Slack cible.

## Serverless

Le build Nuxt peut techniquement cibler du serverless, mais le store JSON local n’y est pas fiable : les instances peuvent être éphémères ou multiples. Pour ce mode, implémente un adaptateur persistant dans `server/utils/store.ts` avant de déployer.
