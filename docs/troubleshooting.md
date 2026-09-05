# Dépannage

## L’interface indique une configuration serveur nécessaire

Vérifie que `.env` existe, que les trois secrets contiennent au moins 32 caractères et que le serveur a été relancé après modification.

```bash
NUXT_SESSION_SECRET=...
NUXT_TOKEN_ENCRYPTION_KEY=...
NUXT_CRON_SECRET=...
```

## Spotify renvoie un accès refusé

- le compte Spotify est-il ajouté dans Users Management ?
- le compte propriétaire de l’app a-t-il Premium ?
- le redirect URI est-il strictement identique, y compris le port et le slash final ?
- l’app utilise-t-elle bien le produit Web API ?

## Slack se connecte mais le statut ne change pas

- l’installation Slack a-t-elle été faite après ajout des nouveaux scopes ?
- `users.profile:read` et `users.profile:write` sont-ils bien des User Token Scopes ?
- le workspace autorise-t-il cette app à modifier les profils ?
- le statut n’a-t-il pas été modifié manuellement ? Dans ce cas, clique sur `Reprendre la main`.

## Le cron répond 401

Le header doit être exactement :

```text
Authorization: Bearer <valeur exacte de NUXT_CRON_SECRET>
```

Vérifie aussi que la variable est disponible dans l’environnement du job, et pas seulement dans ton shell interactif.

## Le cron répond mais ne synchronise personne

La route ignore les utilisateurs sans Spotify, sans Slack ou avec `sync.enabled` à `false`. Vérifie la session et les deux connexions dans le dashboard.

## `reauth_required`

Le refresh token Spotify est expiré, révoqué ou invalide. Clique sur `Reconnecter` ; ne supprime pas manuellement le fichier store sans sauvegarde.

## Le fichier store est illisible

Vérifie que `NUXT_TOKEN_ENCRYPTION_KEY` est exactement la même clé que lors de l’écriture. Une rotation de cette clé sans migration rend les credentials impossibles à déchiffrer.
