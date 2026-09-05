# Sécurité

## Secrets

Les secrets suivants sont exclusivement serveur :

| Variable | Utilisation |
| --- | --- |
| `NUXT_SESSION_SECRET` | signature de session et des states OAuth |
| `NUXT_TOKEN_ENCRYPTION_KEY` | chiffrement AES-256-GCM des tokens |
| `NUXT_CRON_SECRET` | authentification de l’appel cron |
| `NUXT_*_CLIENT_SECRET` | échange OAuth fournisseur |

Ils ne doivent jamais être préfixés par `NUXT_PUBLIC_`, affichés dans l’interface ou committés.

## Session

Le cookie ne contient pas de token provider. Il contient un identifiant utilisateur aléatoire et une signature HMAC. Toute modification du cookie est rejetée avec une comparaison résistante au timing.

Le cookie est HttpOnly et SameSite Lax. En production, il est Secure et ne circule donc qu’en HTTPS.

## OAuth

Les flux Spotify et Slack utilisent :

- un `state` cryptographiquement aléatoire ;
- un cookie de state signé ;
- une expiration de 10 minutes ;
- une vérification stricte du provider et de la valeur retournée ;
- un échange de code exclusivement côté serveur.

Le Client Secret et les tokens ne sont jamais inclus dans les URLs de redirection.

## Tokens au repos

Chaque token est chiffré avec AES-256-GCM et une IV aléatoire avant d’être écrit. Le fichier n’est pas un coffre-fort partagé : protège aussi le filesystem, les sauvegardes et la machine qui exécute Node.

## Protection du statut

Avant une écriture Slack, l’application compare le custom status courant avec le dernier statut qu’elle a elle-même appliqué. Un changement externe déclenche `manualOverride` et bloque les prochaines écritures jusqu’à une reprise explicite.

## Limites du modèle

- Le store JSON n’est pas adapté à plusieurs instances concurrentes ou à un filesystem éphémère.
- Il n’y a pas de gestion d’organisation ou de rôles : chaque session contrôle uniquement son propre enregistrement.
- Le cron secret doit être injecté par le fournisseur de scheduling, pas placé dans une URL.
- Une rotation de clé de chiffrement exige une migration, documentée dans [operations.md](operations.md).
