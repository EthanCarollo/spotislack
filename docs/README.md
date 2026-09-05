# Documentation Spotislack

Spotislack est une application Nuxt 4 qui synchronise le playback Spotify avec le custom status Slack de chaque utilisateur.

## Parcours recommandé

1. [Démarrage local](getting-started.md) — installer le projet et remplir `.env`.
2. [Configurer Spotify et Slack](integrations.md) — créer les apps et déclarer les callbacks OAuth.
3. [Comprendre l’architecture](architecture.md) — flux, stockage et protection du statut manuel.
4. [Référence API](api.md) — routes, authentification et réponses.
5. [Déployer](deployment.md) — serveur Node, volume persistant et cron.
6. [Exploiter le service](operations.md) — monitoring, sauvegardes et reconnexion.
7. [Sécurité](security.md) — secrets, cookies, tokens et modèle de menace.
8. [Dépanner](troubleshooting.md) — erreurs fréquentes et résolution.
9. [Contribuer](contributing.md) — conventions de commits et contrôles à lancer.

## Vue rapide

```text
Spotify OAuth ─┐
               ├─ Nuxt/Nitro ── store chiffré ── cron sync ── Slack status
Slack OAuth ───┘
```

## Périmètre produit

Le projet est dimensionné pour un usage personnel ou une petite bêta. Les apps Spotify en Development Mode sont limitées par Spotify à cinq utilisateurs autorisés et le propriétaire doit avoir Premium. L’hébergement est léger, mais le stockage doit être persistant pour que la synchronisation fonctionne navigateur fermé.
