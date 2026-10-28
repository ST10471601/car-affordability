# Car Affordability

## Prerequisites

- Node.js 26 (see `.nvmrc`)
- pnpm 12 (see `packageManager` in `package.json`)

## Getting started

```sh
pnpm install
pnpm dev
```

## Scripts

| Script              | Purpose                          |
| ------------------- | -------------------------------- |
| `pnpm dev`          | Start the development server     |
| `pnpm build`        | Create a production build        |
| `pnpm start`        | Serve the production build       |
| `pnpm lint`         | Lint with ESLint                 |
| `pnpm typecheck`    | Type-check with TypeScript       |
| `pnpm format`       | Format with Prettier             |
| `pnpm format:check` | Check formatting without writing |
| `pnpm test`         | Run the test suite once          |
| `pnpm test:watch`   | Run the test suite in watch mode |

## Repository layout

- `src/` — Next.js application
- `etl/` — Python ETL
