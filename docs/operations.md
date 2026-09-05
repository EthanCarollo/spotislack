# Exploitation

## Cycle normal

1. L’utilisateur autorise Spotify et Slack.
2. Le dashboard ou le cron appelle `/api/sync`.
3. Spotify renvoie le playback courant.
4. Slack est lu pour détecter une éventuelle modification manuelle.
5. Le statut est écrit uniquement s’il diffère de la valeur déjà appliquée.
6. `lastTrack`, `lastApplied`, `lastSyncedAt` et les erreurs sont persistés.

## États visibles

- `connected` : le provider possède des credentials locaux ;
- `disconnected` : le provider n’est pas configuré pour cet utilisateur ;
- `reauth_required` : Spotify demande une nouvelle autorisation ;
- `manualOverride` : le statut Slack a été modifié hors de Spotislack ;
- `enabled: false` : la synchronisation est en pause.

## Reconnexion Spotify

Spotify expire les refresh tokens après six mois dans les cas concernés. Une erreur `invalid_grant` est transformée en état `reauth_required`. L’utilisateur clique sur `Reconnecter` ; le nouveau refresh token remplace l’ancien.

## Statut Slack manuel

Un statut manuel détecté ne doit pas être écrasé automatiquement. L’utilisateur peut soit laisser Spotislack en pause, soit cliquer sur `Reprendre la main`, ce qui constitue l’autorisation explicite de réappliquer le statut Spotify.

## Sauvegardes

Sauvegarde le fichier défini par `NUXT_STORAGE_PATH` dans un emplacement privé et chiffré. Une copie est inutilisable sans `NUXT_TOKEN_ENCRYPTION_KEY`, mais elle reste sensible : protège-la comme une donnée d’authentification.

Avant toute restauration, arrête le processus Node ou restaure le fichier atomiquement, puis vérifie :

```bash
curl --fail https://status.example.com/api/health
```

## Rotation des secrets

- Rotation de `NUXT_SESSION_SECRET` : invalide les sessions existantes, mais ne touche pas aux tokens.
- Rotation de `NUXT_CRON_SECRET` : exige la mise à jour du job cron.
- Rotation de `NUXT_TOKEN_ENCRYPTION_KEY` : nécessite une migration de ré-encryption de chaque credential avant de supprimer l’ancienne clé.

Ne change jamais la clé de chiffrement seule sans procédure de migration : les tokens existants deviendraient illisibles.

## Rate limits

Le cron est séquentiel et ne fait pas d’écriture Slack si le statut est déjà correct. Évite de réduire l’intervalle sous 60 secondes sans mesurer les limites Spotify et Slack.
