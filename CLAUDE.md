# CLAUDE.md

API de dépôt des Bases Adresses Locales : versionning centralisé des fichiers BAL (révisions), gestion des habilitations à publier, clients et chefs de file. Consommée par mes-adresses-api, moissonneur-bal, bal-admin, id-fix et la BAN.

## Commandes

```bash
yarn                         # install (yarn uniquement)
cp .env.sample .env
yarn dev                     # API en watch
yarn build && yarn start
yarn lint                    # eslint --fix
yarn test                    # jest (testcontainers Postgres → Docker doit tourner)
yarn test src/modules/revision/revision.spec.ts   # un seul fichier
yarn typeorm:migration:run   # applique les migrations
yarn typeorm:migration:down  # revert la dernière
yarn typeorm migration:generate migrations/<nom> -d ./typeorm.config.ts
```

Node 24 (`engines`). CI : `yarn lint`, `yarn test`, `yarn build`.

## Architecture

NestJS + TypeORM/Postgres. Alias : `@/modules/*` → `src/modules/*`, `@/lib/*` → `src/lib/*`.

- `src/modules/revision/` : cœur métier. Une révision = un dépôt de fichier BAL pour une commune (create → upload file → compute/validate → publish). `validation.service.ts` utilise `@ban-team/validateur-bal`, le formatage utilise `@ban-team/formatter-bal`. `publication.controller.ts` expose la publication, `notify.service.ts` notifie (Mattermost/BAN).
- `src/modules/habilitation/` : droit pour un client de publier pour une commune ; validation par code email ou ProConnect (`pro_connect/`).
- `src/modules/client/`, `mandataire/`, `chef_de_file/` (+ `perimeters.entity.ts`) : qui publie et sur quel périmètre.
- `src/modules/file/` : stockage des fichiers BAL.
- `src/modules/bal_admin/`, `ban/`, `api_annuaire/` : clients HTTP vers bal-admin, BAN, API Annuaire.
- `src/lib/class/guards/` : `admin.guard.ts` (`ADMIN_TOKEN`), `client.guard.ts` (token client), `revision.guard.ts`.
- `src/email-templates/` : templates des mails (habilitation…).

## Points d'attention

- `synchronize: false` : toute modif d'entité nécessite une migration dans `migrations/`. Une nouvelle entité doit aussi être ajoutée dans `typeorm.config.ts`.
- Les tests `*.spec.ts` sont des tests d'intégration contre un vrai Postgres (testcontainers) ; les mocks HTTP sont dans `revision/mock/`.
- `DEMO_MODE=1` : pas d'envoi de mail, code d'habilitation `000000`.
- Toute montée de version de `@ban-team/validateur-bal` / `formatter-bal` impacte la validation des dépôts en prod : commit dédié `package: validateur-bal vX.Y.Z`.
