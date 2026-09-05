# Configurer Spotify et Slack

## Spotify

1. Ouvre le [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Crée une app Web API.
3. Ajoute l’URL suivante dans Redirect URIs :

```text
http://localhost:3000/api/auth/spotify/callback
```

4. Copie le Client ID et le Client Secret dans `.env` :

```dotenv
NUXT_SPOTIFY_CLIENT_ID=
NUXT_SPOTIFY_CLIENT_SECRET=
```

Spotislack utilise l’Authorization Code Flow côté serveur et demande uniquement `user-read-currently-playing`. Le callback échange le code contre un access token et un refresh token, puis les persiste chiffrés.

Le propriétaire d’une app Spotify en Development Mode doit avoir Premium. Cette app est limitée à cinq utilisateurs Spotify autorisés : ajoute les comptes de test dans Users Management avant de leur transmettre le lien. ([Quota modes Spotify](https://developer.spotify.com/documentation/web-api/concepts/quota-modes))

Les refresh tokens des apps concernées expirent après six mois. L’utilisateur devra alors reconnecter Spotify ; l’application ne tente pas de contourner cette expiration. ([Refresh tokens Spotify](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens))

## Slack

1. Ouvre [Slack API](https://api.slack.com/apps) et crée une app.
2. Dans OAuth & Permissions, ajoute les User Token Scopes :

```text
users.profile:read
users.profile:write
```

3. Ajoute ce Redirect URL :

```text
http://localhost:3000/api/auth/slack/callback
```

4. Copie les identifiants dans `.env` :

```dotenv
NUXT_SLACK_CLIENT_ID=
NUXT_SLACK_CLIENT_SECRET=
```

Le flux Slack demande un user scope et utilise `authed_user.access_token`, qui commence normalement par `xoxp-`. Le bot token éventuel de la réponse OAuth n’est pas utilisé. ([Slack OAuth v2](https://api.slack.com/authentication/oauth-v2))

L’écriture du statut passe par `users.profile.set`, qui requiert un user token et `users.profile:write`. ([Slack users.profile.set](https://api.slack.com/methods/users.profile.set))

## Production

En production, remplace les deux callbacks par leur équivalent HTTPS, par exemple :

```text
https://status.example.com/api/auth/spotify/callback
https://status.example.com/api/auth/slack/callback
```

La valeur `NUXT_PUBLIC_APP_URL` doit être exactement `https://status.example.com`. Nuxt refuse une URL vide ou non HTTPS en production.

## Flux d’autorisation

Chaque flux utilise un `state` aléatoire conservé dans un cookie HttpOnly signé. Le callback vérifie le provider, l’âge du state et sa correspondance avant d’échanger le code. Un state absent, expiré ou falsifié est rejeté.
