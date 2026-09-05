# Démarrage local

## Prérequis

- Node.js 22 ou plus récent ;
- un compte Spotify Developer ;
- une Slack App ;
- un compte Spotify Premium pour le propriétaire de l’app en Development Mode.

## Installation

Depuis la racine du dépôt :

```bash
npm install
cp .env.example .env
```

Sous PowerShell :

```powershell
npm install
Copy-Item .env.example .env
```

Génère trois secrets différents. Une valeur de 32 octets encodée en base64url convient :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Renseigne les résultats dans :

```dotenv
NUXT_SESSION_SECRET=
NUXT_TOKEN_ENCRYPTION_KEY=
NUXT_CRON_SECRET=
```

Ne réutilise pas la même valeur pour ces trois variables.

## URL locale

Dans `.env` :

```dotenv
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

Les callbacks à déclarer sont alors :

```text
http://localhost:3000/api/auth/spotify/callback
http://localhost:3000/api/auth/slack/callback
```

L’URL doit être identique caractère par caractère à celle configurée dans les dashboards. Si le port 3000 est déjà utilisé, démarre Nuxt avec un port explicite et mets à jour `NUXT_PUBLIC_APP_URL` et les callbacks :

```bash
npm run dev -- --port 3001
```

## Démarrage

```bash
npm run dev
```

Puis ouvre `http://localhost:3000` et connecte successivement Spotify et Slack.

## Contrôles qualité

```bash
npm test
npm run typecheck
npm run build
```

## Données locales

Après la première connexion, le store est créé dans :

```text
.data/spotislack.json
```

Ce fichier contient des tokens chiffrés et ne doit jamais être commité ou copié dans un ticket, un log ou une archive publique.
