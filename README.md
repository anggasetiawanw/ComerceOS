Nagihin — commerce operating system for small Indonesian sellers: storefront, automatic invoicing,
verified buyer database, mini accounting.

Engineering docs live in .docs/, starting at .docs/README.md.

Getting started

Requirements: Node 22+, pnpm, Docker.

1. Copy .env.example to .env and fill in values.
2. Install dependencies: pnpm install
3. Start Postgres and Redis: docker compose -f docker/docker-compose.yml up postgres redis -d
4. Generate the Prisma client: pnpm exec prisma generate
5. Apply migrations: pnpm run prisma:deploy
6. Run everything: pnpm dev

This starts apps/api on PORT (default 3001), apps/worker, and web on port 3000.

Health checks: http://localhost:3001/health and http://localhost:3001/health/ready
API docs: http://localhost:3001/docs

To run the whole stack (Postgres, Redis, api, worker) in Docker instead of locally:
docker compose -f docker/docker-compose.yml up --build

Common commands

pnpm dev - run all apps in watch mode
pnpm build - build all workspaces
pnpm lint - lint all workspaces
pnpm typecheck - typecheck all workspaces
pnpm test - run unit tests
pnpm run prisma:migrate - create a new migration in development
pnpm run prisma:seed - run the base seed
