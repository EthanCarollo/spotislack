# Référence API

Toutes les routes sont servies par Nitro. Les routes utilisateur utilisent le cookie de session HttpOnly ; les tokens fournisseur ne sont jamais exposés.

## Healthcheck

```http
GET /api/health
```

Réponse :

```json
{ "ok": true, "service": "spotislack" }
```

Cette route ne vérifie pas les fournisseurs ni le cron ; elle indique seulement que le processus Nuxt répond.

## Authentification

| Méthode | Route | Authentification | Effet |
| --- | --- | --- | --- |
| `GET` | `/api/auth/spotify` | aucune | Redirige vers Spotify OAuth |
| `GET` | `/api/auth/spotify/callback` | state OAuth | Enregistre Spotify et ouvre la session |
| `GET` | `/api/auth/slack` | aucune | Redirige vers Slack OAuth |
| `GET` | `/api/auth/slack/callback` | state OAuth | Enregistre Slack et ouvre la session |
| `GET` | `/api/auth/status` | session optionnelle | Renvoie l’état public courant |
| `POST` | `/api/auth/logout` | session optionnelle | Supprime le cookie de session |
| `POST` | `/api/auth/disconnect` | session | Déconnecte `spotify` ou `slack` |

`POST /api/auth/disconnect` reçoit :

```json
{ "provider": "spotify" }
```

## Synchronisation utilisateur

```http
POST /api/sync
```

Requiert une session avec Spotify et Slack connectés. Le serveur lit le playback Spotify, vérifie le statut Slack courant, puis appelle `users.profile.set` uniquement lorsque la valeur doit changer.

```http
POST /api/sync/toggle
Content-Type: application/json

{ "enabled": true }
```

Passer `enabled: true` est une reprise explicite : cela réinitialise le mode `manualOverride` et force la prochaine mise à jour. Passer `false` met la synchronisation en pause sans modifier le statut existant.

Réponse de synchronisation :

```json
{
  "ok": true,
  "action": "updated",
  "message": "Statut Slack mis à jour.",
  "track": {
    "id": "track-id",
    "kind": "track",
    "title": "Veridis Quo",
    "artist": "Daft Punk",
    "album": "Discovery",
    "isPlaying": true,
    "observedAt": 1778000000000
  },
  "sync": {
    "enabled": true,
    "manualOverride": false,
    "lastSyncedAt": 1778000000000
  }
}
```

Actions possibles : `updated`, `unchanged`, `cleared`, `skipped`, `error`.

## Synchronisation cron

```http
GET /api/cron/sync
Authorization: Bearer <NUXT_CRON_SECRET>
```

La route parcourt uniquement les utilisateurs actifs ayant les deux intégrations. Un utilisateur en erreur ne bloque pas les autres ; son résultat est renvoyé dans la liste.

## Codes d’erreur courants

| Code HTTP | Signification |
| --- | --- |
| `401` | session ou secret cron absent/invalide |
| `400` | provider de déconnexion invalide |
| `500` | configuration serveur absente ou invalide |
| `502` | réponse Spotify/Slack inutilisable |
