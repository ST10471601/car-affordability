# Car Affordability

## Prerequisites

- Node.js 26 (see `.nvmrc`)
- pnpm 12 (see `packageManager` in `package.json`)
- Docker, only for the `db:*` scripts other than `db:migration`

## Getting started

After cloning, run `git config core.hooksPath .githooks` to enable the repository's Git hooks.

```sh
pnpm install
pnpm dev
```

## Scripts

| Script              | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| `pnpm dev`          | Start the development server                                 |
| `pnpm build`        | Create a production build                                    |
| `pnpm start`        | Serve the production build                                   |
| `pnpm lint`         | Lint with ESLint                                             |
| `pnpm typecheck`    | Type-check with TypeScript                                   |
| `pnpm format`       | Format with Prettier                                         |
| `pnpm format:check` | Check formatting without writing                             |
| `pnpm test`         | Run the test suite once                                      |
| `pnpm test:watch`   | Run the test suite in watch mode                             |
| `pnpm db:start`     | Start the local Supabase stack                               |
| `pnpm db:stop`      | Stop the local Supabase stack                                |
| `pnpm db:reset`     | Recreate the local database from the migrations              |
| `pnpm db:test`      | Run the pgTAP database tests                                 |
| `pnpm db:lint`      | Lint the local database, failing on warnings                 |
| `pnpm db:migration` | Create a migration, e.g. `pnpm db:migration create_listings` |

## Database deployment

Pushing migrations to `main` runs the Deploy database workflow, which links the Supabase project and runs `supabase db push`. It can also be started manually. It uses the `production` GitHub Environment, which needs:

- secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`
- variable `SUPABASE_PROJECT_REF`

## Repository layout

- `src/` — Next.js application
- `etl/` — Python ETL
- `supabase/` — Supabase config, migrations and database tests
