# Architecture Spotislack

## Objectif

Pour chaque utilisateur, Spotislack lit le playback Spotify et écrit le titre courant dans le custom status du propre compte Slack de cet utilisateur.

```text
Navigateur
   │ OAuth uniquement via les routes Nuxt
   ▼
Nuxt 4 / Nitro
   ├── Spotify Authorization Code + refresh
   ├── Slack OAuth user token xoxp-
   ├── Store JSON chiffré AES-256-GCM
   └── Sync toutes les 45 s côté dashboard
          ▲
          └── /api/cron/sync toutes les 60 s même navigateur fermé
```

## Pourquoi cette forme

- Le secret Spotify reste dans Nitro : il ne part jamais dans le navigateur.
- Les tokens ne sont jamais renvoyés par une API client et sont chiffrés avant écriture sur disque.
- Une session est un identifiant aléatoire signé par HMAC ; le cookie est `HttpOnly`, `SameSite=Lax` et `Secure` en production.
- Le store fichier est adapté à un serveur Node unique et à la limite de cinq utilisateurs Spotify. Il doit être placé sur un volume persistant.
- Un déploiement serverless multi-instance devra remplacer uniquement l’implémentation de `server/utils/store.ts` par un adaptateur Postgres/Supabase conservant le même modèle et le même chiffrement.

## Routes principales

| Route | Rôle |
| --- | --- |
| `GET /api/auth/spotify` | Crée un `state` signé et démarre Spotify OAuth |
| `GET /api/auth/spotify/callback` | Échange le code, persiste les tokens, crée la session |
| `GET /api/auth/slack` | Démarre Slack OAuth avec les user scopes |
| `GET /api/auth/slack/callback` | Persiste le user token Slack et le workspace |
| `GET /api/auth/status` | Renvoie uniquement l’état public de la session |
| `POST /api/sync` | Synchronise l’utilisateur courant |
| `POST /api/sync/toggle` | Met en pause ou reprend ; la reprise explicite peut reprendre la main sur Slack |
| `GET /api/cron/sync` | Synchronise tous les utilisateurs actifs après vérification du bearer secret |
| `POST /api/auth/disconnect` | Efface les credentials locaux et nettoie le statut app-owned si possible |

## Protection contre l’écrasement d’un statut manuel

À chaque synchronisation, le serveur lit le statut Slack courant avec `users.profile.get`.

1. Si le statut courant correspond au dernier statut écrit par Spotislack, l’écriture suivante est autorisée.
2. Si le statut ne correspond plus, la synchronisation passe en `manualOverride` et n’écrit plus rien.
3. Le bouton `Reprendre la main` envoie une reprise explicite et force la prochaine mise à jour.
4. Si aucun statut n’a encore été écrit par Spotislack et qu’un statut existe déjà, il est considéré comme manuel par défaut.

Cela évite qu’un statut de réunion, d’absence ou de contexte personnel soit silencieusement remplacé.

## Configuration fournisseur

Spotify :

- redirect URI : `/api/auth/spotify/callback` ;
- scope : `user-read-currently-playing` ;
- le refresh token est renouvelé côté serveur quand l’access token approche de son expiration ;
- un `invalid_grant` bascule l’interface en reconnexion nécessaire.

Slack :

- redirect URI : `/api/auth/slack/callback` ;
- user scopes : `users.profile:read,users.profile:write` ;
- le token utilisé est celui de `authed_user.access_token`, pas le bot token de premier niveau ;
- l’écriture utilise `users.profile.set` avec une expiration de statut à zéro.

## Mise en production

1. Déployer le build Node Nuxt (`npm run build`, puis `node .output/server/index.mjs`).
2. Définir `NUXT_PUBLIC_APP_URL` avec l’URL HTTPS publique exacte.
3. Définir les quatre identifiants fournisseur, les deux secrets aléatoires et `NUXT_STORAGE_PATH` sur un volume persistant.
4. Reporter les callbacks HTTPS exacts dans les dashboards Spotify et Slack.
5. Ajouter les amis Spotify dans Users Management jusqu’à la limite autorisée par l’app en Development Mode.
6. Planifier `/api/cron/sync` toutes les 60 secondes avec `Authorization: Bearer <NUXT_CRON_SECRET>`.

## Contraintes connues

Les restrictions Spotify actuelles sont la contrainte produit principale : le propriétaire d’une app en Development Mode doit avoir Premium et l’app est limitée à cinq utilisateurs autorisés. Les refresh tokens des nouvelles apps expirent après six mois ; l’interface prévoit donc un bouton de reconnexion. Le service n’essaie pas de contourner ces limites.
