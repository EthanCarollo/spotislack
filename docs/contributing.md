# Contribuer

## Branches et commits

Les commits suivent la convention Angular :

```text
<type>: <description impérative courte>
```

Types utilisés dans le projet :

- `feat` : nouvelle fonctionnalité ;
- `fix` : correction de comportement ou de sécurité ;
- `test` : ajout ou modification de tests ;
- `docs` : documentation ;
- `chore` : outillage ou maintenance.

Exemples :

```text
feat: add spotify reconnect flow
fix: reject insecure production callback url
docs: explain persistent storage deployment
```

Un commit doit rester cohérent et réversible. Évite de mélanger une refonte visuelle, une migration de données et un changement d’API dans le même commit.

## Avant chaque push

```bash
npm test
npm run typecheck
npm run build
npm audit --omit=dev
git diff --check
git status --short --untracked-files=all
```

Vérifie notamment qu’aucun `.env`, `.data`, token ou log local n’est suivi par Git.

## Structure

```text
app/                 Interface Nuxt/Vue et CSS
public/brand/        Logo et bannière SVG
server/api/          Routes HTTP Nitro
server/utils/        OAuth, stockage, sécurité et synchronisation
shared/              Types partagés client/serveur
docs/                Documentation projet
```

## Changements fournisseur

Toute modification de scope OAuth, de callback, de stockage ou de statut Slack doit être documentée dans `docs/integrations.md`, `docs/security.md` ou `docs/architecture.md` selon le sujet.
