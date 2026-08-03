# 12 — Roadmap & Sprints

**Capacity assumption:** one part-time engineer, ~20–25 hours per two-week sprint (~10–12h/week).
Every estimate below is against that capacity. Adjust proportionally for a different pace.

---

## 1. Milestones

| M | Milestone | Sprints | Complexity | Outcome |
|---|---|---|---|---|
| **M0** | Foundation | 1 | Low | Repo, Docker, CI, config, health checks, Prisma bootstrap |
| **M1** | Identity | 2 | Medium | Google OAuth + email/password, account linking, JWT + rotation, guards, profile |
| **M2** | Store & storefront | 3 | Medium | Store CRUD, username, public `/@username`, social links |
| **M3** | Catalog | 4 | Medium | Products, images, digital files, storefront product pages |
| **M4** | Transaction core | 5 | **High** | Checkout, orders, Midtrans, webhooks, outbox, digital delivery |
| **M5** | Money | 6 | **High** | Ledger, balances, invoices, CRM capture |
| **M6** | Payouts & admin | 7 | High | Withdrawals, admin dashboard, buyer `/akun`, audit |
| **M7** | **Thin MVP launch** | 8 | Medium | Reports, polish, production hardening, first sellers |
| **M8** | Path B | 9 | Medium | Inquiries, manual orders, WA channel |
| **M9** | Promotions | 10 | Medium | Promotions, auto-apply links, redemptions |
| **M10** | Physical & disputes | 11 | High | Shipping, tracking, disputes, refunds |
| **M11** | Operations | 12 | Medium | Reconciliation, balance verification, notification log |
| **M12** | Reporting depth | 13 | Medium | Gross profit, product performance, CRM export |
| **M13** | Monetization | 14 | Medium | Subscriptions, Pro gating, recurring billing |

```mermaid
gantt
    title Nagihin — part-time roadmap (2-week sprints)
    dateFormat YYYY-MM-DD
    axisFormat %b %d

    section Foundation
    M0 Setup            :m0, 2026-08-04, 14d
    M1 Identity         :m1, after m0, 14d
    section Core product
    M2 Store            :m2, after m1, 14d
    M3 Catalog          :m3, after m2, 14d
    M4 Transactions     :crit, m4, after m3, 14d
    M5 Money            :crit, m5, after m4, 14d
    M6 Payouts & admin  :crit, m6, after m5, 14d
    section Launch
    M7 Thin MVP         :milestone, m7, after m6, 14d
    section Post-launch
    M8 Path B           :m8, after m7, 14d
    M9 Promotions       :m9, after m8, 14d
    M10 Physical        :m10, after m9, 14d
    M11 Operations      :m11, after m10, 14d
    M12 Reporting       :m12, after m11, 14d
    M13 Monetization    :m13, after m12, 14d
```

---

## 2. Sprint backlog

### Sprint 1 — Foundation
**Goal:** an empty but production-shaped system that deploys.

- [x] pnpm monorepo: `apps/api`, `apps/worker`, `packages/contracts`, `web`
- [x] NestJS bootstrap: config module with env schema validation at boot, Pino logging, global pipes/filters/interceptors
- [x] Prisma init, migration 001. **Amendment:** Postgres is self-hosted via Docker Compose (and later the VPS) rather than Supabase-hosted; Supabase is scoped to object storage only ([13 §3](./13-devops-testing-prod.md#3-production-checklist) amended accordingly). `DATABASE_URL`/`DIRECT_DATABASE_URL` are still kept distinct so a pooler can be dropped in later without a code change
- [x] Shared kernel: `Result`, base entity/aggregate/VO, UUIDv7, `Money`
- [x] Docker Compose: Postgres, Redis, API, worker
- [x] Swagger at `/docs`, health at `/health` and `/health/ready`
- [x] Next.js bootstrap: Tailwind, shadcn init, theme provider, dark mode
- [x] GitHub Actions: lint, typecheck, test, build (integration/e2e jobs deferred — no Postgres-backed module or staging environment to test yet)
- [ ] Deploy skeleton to Railway/Render + Vercel — **deferred.** No hosting accounts yet; the production target is a self-hosted VPS with its own domain rather than Railway/Render/Vercel. `Dockerfile.api`/`Dockerfile.worker` are already VPS-portable; the actual deploy pipeline (and Vercel or a VPS-hosted `web`) is revisited once the VPS is ready

**Deliverable:** `docker compose up` runs the whole stack; verified locally — Postgres/Redis healthy,
`/health` and `/health/ready` return green, migration 001 applies cleanly. No deployed environment yet.

---

### Sprint 2 — Identity
**Goal:** a user can sign in and stay signed in, by Google or by email/password.

- [x] Migration 002: `users` (+ `role`, `password_hash`, `email_verified_at`, nullable `google_id`), `refresh_tokens`, `verification_tokens` ([AD-13](./README.md#decision-log))
- [x] `User` aggregate, `Email`/`UserRole`/`PasswordHash` VOs, `UserRepository` + mapper. **Amendment:** `Phone` stays a plain nullable string on the aggregate rather than a VO — it isn't validated or used yet; wrap it when the WhatsApp channel (Sprint 9) needs a real format check
- [x] Google OAuth: authorize redirect, state in Redis, PKCE, callback, `id_token` verification
- [x] Email/password: register, Argon2id hashing, login, email verification, forgot/reset password ([07 §1a](./07-auth.md#1a-email--password-registration-and-login))
- [x] Minimal `EmailSender` (Resend) for verification + reset emails only — full `NotificationChannel` port stays Sprint 6
- [x] Account linking: `POST /auth/google/link`, `POST /auth/set-password`, `DELETE /auth/google/unlink` — explicit-authenticated-action only, never implicit ([07 §1b](./07-auth.md#1b-account-linking))
- [x] Token issuance: RS256 access (15m), opaque refresh (30d, hashed)
- [x] Rotation with family reuse detection
- [x] `JwtAuthGuard` global + `@Public()`, `RolesGuard`, `@CurrentUser()`
- [x] `/auth/*` and `/users/me` endpoints, stricter rate limit on login/register/forgot-password
- [x] Frontend: `/masuk` (password form + Google button), `/daftar`, `/lupa-password`, `/reset-password`, `/callback`, `/lengkapi-profil`, token store, silent refresh, single-flight
- [x] Middleware protecting `/dashboard/*` and `/akun/*` — implemented as `web/src/proxy.ts` (Next.js renamed `middleware.ts` to `proxy.ts`)
- [x] Tests: OAuth flow, password register/verify/login, forgot/reset, linking rules (both directions + retain-one-method invariant), rotation, reuse detection, guards

**Deliverable:** sign in with Google or with email/password, verify email, reset a forgotten password,
refresh across a reload, sign out. Connecting a Google account from settings ships with Sprint 3's
`/dashboard/pengaturan`.

**Status: done.** Verified 2026-07-29 — 95/95 unit tests pass, lint and typecheck clean, integration
suite (`identity.int-spec.ts`) covers register→verify→login, forgot/reset (incl. session revocation),
refresh rotation + reuse detection, and Google login collision/new-user cases. `test:integration`
wasn't run live (requires Docker, not running locally) but was read in full and is not stubbed.

---

### Sprint 3 — Store & public storefront
**Goal:** a seller has a shareable link.

- [x] Migration 003: `stores` (+ `invoice_counter`), `social_links`
- [x] `Store` aggregate, `Username` VO + reserved blocklist, `SettlementPolicy` VO
- [x] Store creation, profile update, username availability + change
- [x] Settlement mode setting with floor enforcement
- [x] Social links CRUD + reorder
- [x] Storefront read context + Redis cache with event invalidation
- [x] Supabase Storage: avatar and banner upload
- [x] Frontend: dashboard shell + sidebar, `/dashboard/toko`, `/dashboard/pengaturan`
- [x] Frontend: public `/@username` (SSR), `StorefrontHeader`, social links
- [x] Seed: reserved usernames, plans, bank codes

**Deliverable:** create a store, claim `@username`, view the live public page.

**Status: done.** Verified 2026-07-30 — 33 API unit suites (225 tests) and 3 integration suites
(23 tests, real Postgres + Redis) pass; web typecheck, lint, and `next build` are clean. Live
smoke test against running `api`/`web` dev servers: register → verify → login → create store →
username availability (reserved + free) → social link add → public `/storefront/:username` (cached
in Redis, case-insensitive, 404s for unknown) → SSR `/@username` page (display name present in
initial HTML, correct `<title>`) → `/username` (no `@`) also resolves → unknown username renders
the not-found page.

Decisions and drift from the docs, recorded here rather than silently:
- Reserved usernames are a frozen code constant (`shared/kernel/value-objects/reserved-usernames.ts`),
  not a table; plan fee rates come from env (`PLAN_FEE_RATE_FREE`/`_PRO`); bank codes are deferred to
  Sprint 7. `prisma/seed/base.ts` stays an empty no-op — see [06 §5](./06-database-roadmap.md).
- `Username` VO lives in `shared/kernel/value-objects/`, not inside the store module, so the
  storefront module can validate/normalize a handle without importing another module's domain layer.
  This makes Sprint 2's module-local `Email` VO the inconsistent one, not `Username`.
- `stores.owner_id` is `@unique` — one store per user is a database invariant, not just an
  application check. Not stated explicitly in the docs; consistent with "satu seller = satu toko."
- `stores.owner_id → users` FK is `ON DELETE RESTRICT` (a store carries balances); `social_links →
  stores` cascades (purely presentational) — matches [06 §4](./06-database-roadmap.md#4-constraints).
- Username changes are throttled *and* governed by two Redis-backed policies with no schema
  column: a 30-day per-store change cooldown, and a 90-day reservation on a released handle so a
  stranger cannot immediately claim a seller's old link. Both configurable via
  `USERNAME_CHANGE_COOLDOWN_DAYS` / `USERNAME_RESERVATION_DAYS`.
- `POST /stores/me/avatar` and `POST /stores/me/banner` (multipart upload, magic-byte validated,
  2MB/5MB limits) are new endpoints not listed in [05 §3](./05-api-roadmap.md); they upload and
  persist the URL in one step rather than a bare-URL-then-PATCH flow.
- Storage has three adapters behind one `StorageUploader` port: Supabase (used when
  `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are set), a filesystem adapter writing into
  `web/public/uploads` (used in development when Supabase is unconfigured, so uploads are actually
  testable locally), and a null adapter that throws a clear 503 in production when unconfigured.
- No outbox exists yet (Sprint 5), so storefront cache invalidation is an in-process
  `DomainEventPublisher` (`shared/infrastructure/events/`) that Store publishes to after each
  commit and the storefront module subscribes to. This works only within a single API process —
  the 60s Redis TTL is the real staleness guarantee once there is a second replica or the worker
  starts touching stores. Redis pub/sub is the documented upgrade path.
- The global rate limiter was a single `default` bucket shared by every route, including
  `/users/me`, capped at `AUTH_THROTTLE_LIMIT` (5/min) — a Sprint 2 bug this sprint was the first to
  actually trigger. Fixed by renaming that global bucket's source to `GENERAL_THROTTLE_LIMIT`
  (300/min, matching [05 §17](./05-api-roadmap.md)) and keeping the existing per-route
  `@Throttle` overrides for login/register/forgot-password at the original 5/min.
- `/users/me` and `/users` PATCH responses now include a `store: { id, username, displayName,
  avatarUrl, plan } | null` summary ([05 §2](./05-api-roadmap.md)) — a breaking change to
  `web/src/features/auth/api/auth.api.ts`'s `UserResponse`, updated in the same change.
- `SettlementPolicy`'s `effectiveHoldUntil`/`forcedReleaseAt` are fully implemented and unit-tested
  but not called from any production code path yet — `ProductRiskTier` doesn't exist until Sprint 4
  and the release job doesn't exist until Sprint 6. The risk tier is a local `'low'|'medium'|'high'`
  string union in the VO file rather than an import from a module that doesn't exist yet.
- `StoreOwnerGuard` lives in `modules/store/presentation/guards/`, not `shared/presentation/guards/`
  as [02's folder tree](./02-architecture.md) suggests, because it depends on `STORE_REPOSITORY` and
  a shared-layer file importing a module's token would invert the dependency direction.
- The JWT `storeId` claim is populated on login/refresh but is treated purely as a UI hint — every
  tier-`S` request re-resolves ownership from the database via `StoreOwnerGuard`, per
  [07 §2](./07-auth.md). A user who creates a store keeps working immediately (the guard doesn't
  need the claim); the frontend gets the claim into a fresh token via the existing single-flight
  `refreshAccessToken()` after `POST /stores` succeeds.

---

### Sprint 4 — Catalog
**Goal:** there is something to sell.

- [x] Migration 004: `products`, `digital_files`
- [x] `Product` aggregate, `ProductType`/`ProductStatus`/`Slug`/`StockLevel` VOs, `ProductRiskTierResolver`
- [x] Product CRUD, publish/archive, slug uniqueness per store
- [x] Image upload (public bucket), delete — reorder deferred, see drift below
- [x] Digital file upload (private bucket), validation that digital products have files before publishing
- [x] Public product endpoints + cache
- [x] Frontend: `/dashboard/produk` list, create/edit form, `ImageUploader`, `FileUploader`, `MoneyInput`
- [x] Frontend: public product page with Beli + Tanya buttons (both inert until Sprint 5's checkout — see drift below)
- [x] Tests: product rules, slug collisions, storage integration

**Deliverable:** publish a digital product and see it on the public storefront.

**Status: done.** Verified 2026-07-30 — 43 API unit suites (347 tests) and 4 integration suites
(42 tests, real Postgres + Redis) pass; web typecheck, lint, and `next build` are clean. Live
smoke test against running `api`/`web` servers: register → verify → login → create store →
create product (draft) → publish rejected without a digital file (422) → upload digital file →
publish succeeds → product visible on `GET /storefront/:username` and busts the cache → archive
removes it again. Separately: create a physical product → publish → SSR `/@username` shows it in
the grid → SSR `/@username/produk/:slug` renders name/price/description in the initial HTML
(verified via `view-source`, not devtools) → unknown slug renders the not-found page.

Decisions and drift from the docs, recorded here rather than silently:
- Full sprint scope was estimated at 34-38h against the ~20-25h part-time budget; the following
  items were cut to fit and are the acknowledged gap against the checklist above:
  - **Image reorder** (`PUT /products/:id/images/order`) was not built — upload order is display
    order for now. The checklist above is marked done on upload+delete; reorder is the one
    sub-item still open.
  - **`GET /storefront/:username/products`** (a separate paginated public endpoint) was not
    built. `GET /storefront/:username` embeds up to 24 active products directly instead, so the
    SSR storefront page is one round trip — the more important property for AD-11 SEO/performance.
    `CacheService` has no prefix-delete for per-page keys yet, which this also sidesteps.
  - A dedicated Redis cache layer for individual product-detail pages was not built. The public
    product endpoint is still cached indirectly — the storefront-level 60s cache plus the web
    app's `revalidate: 60` ISR are the only caches. `GET /storefront/:username/products/:slug`
    still exists and is invalidated on product events.
  - Dashboard product list UI has a status filter only (draft/active/archived tabs); free-text
    search and a type filter are not exposed in the UI. The API (`GET /products`) already accepts
    `search` and `productType` query params, so this is a UI-only gap.
  - `PATCH /products/:id/stock` (P1) and `StockReservationService` were not built.
    `PATCH /products/:id` already accepts `stock`, so stock edits work; `StockReservationService`'s
    only real caller is Sprint 5's `MarkOrderPaid`, which doesn't exist yet.
  - No `DataTable`, no `table`/`alert-dialog` shadcn primitives, no `@tanstack/react-table` — the
    product list is a card list (`social-links-editor.tsx` precedent) plus the existing `dialog`
    for archive confirmation. `DataTable` is deferred to Sprint 5, which needs cursor pagination
    and row selection for orders — building it against an 8-field product list would have guessed
    that contract.
  - `MarginWarning` (below-HPP advisory) was not built — `.docs/11-frontend.md` lists it, but it
    is actually a Sprint 10 (Promotions) deliverable per the sprint backlog, not Sprint 4.
- `digital_files` gains three undocumented columns beyond `.docs/brief/database-schema.md`:
  `file_name`, `size_bytes` (`Int`, not `BigInt`, so it never needs bigint-safe JSON handling),
  `content_type`. Needed for a usable files list in the dashboard and for `Content-Disposition`
  when Sprint 5/6 issues signed download URLs.
- `products.images` is a jsonb array of `{ id, path, url }` objects, not the bare "Array URL" the
  database-schema doc describes. The seller API exposes only `{ id, url }`; `path` (the private
  storage key) never leaves the API. The `id` is what `DELETE /products/:id/images/:imageId`
  addresses by, since neither URL nor path is a stable, adapter-independent key.
- `Slug` VO lives in `shared/kernel/value-objects/slug.vo.ts` (matching `Username`'s precedent
  from Sprint 3) rather than inside the catalog module, so the storefront module can normalize a
  slug without importing catalog's domain layer.
- `ProductRiskTier` moved to `shared/kernel/value-objects/product-risk-tier.ts`. `SettlementPolicy`
  in the store module previously declared a local `'low'|'medium'|'high'` union with a comment
  noting it was a placeholder until catalog existed (Sprint 3 note) — that placeholder is now
  gone and both modules share the same kernel type.
- `StoreOwnerGuard` is now exported from `StoreModule` (it was provided but not exported) so
  catalog's controllers can apply it — a gap in Sprint 3's module that only mattered once a second
  module needed the guard.
- `products.store_id` is `ON DELETE RESTRICT` (`.docs/06-database-roadmap.md §4` left this
  relationship unspecified). Matches the doc's stated rule ("financial restricts, presentational
  cascades") and the fact that `order_items → products` will also be `RESTRICT` in Sprint 5 — a
  cascading delete from `stores` would have hit that wall anyway once orders exist.
- `POST /products/:id/publish` is legal from both `draft` and `archived` — the only path back to
  `active` for an archived product, since there is no separate "unarchive" endpoint.
- Public product endpoints (`GET /storefront/:username/products/:slug`) live in
  `modules/storefront`, not a `PublicProductsController` inside `modules/catalog` as
  `.docs/04-entity-design.md §3` names it — matches `.docs/03-bounded-contexts.md §3.15`, which
  assigns the public read surface to storefront specifically because its caching and rate-limit
  needs differ from the seller-facing catalog API, and the cache/invalidator machinery already
  lives there from Sprint 3.
- Offset pagination (`{ data, meta: { page, limit, total, hasMore } }`) is now a real thing:
  `shared/presentation/dto/paginated.dto.ts`'s `Paginated<T>` marker class, detected by
  `TransformInterceptor` and unwrapped into the envelope. `web`'s `apiClient` gained
  `getPaginated<T>` since the existing `doFetch` discarded the `meta` field entirely.
- Product images render through a raw `<img>`, not `next/image`, on both the dashboard and the
  storefront. `next.config.ts`'s `images.remotePatterns` only allows the production Supabase host,
  and the dev-mode filesystem `StorageUploader` adapter serves images from
  `http://localhost:3000/uploads/...` — an http URL that `next/image` won't optimize anyway.
  `ProductImages` (the catalog VO) accordingly accepts both `http` and `https` URLs, unlike
  `StoreProfile`'s avatar/banner fields, which are https-only.
- `web/public/uploads/` was untracked but not gitignored since Sprint 3 (avatars/banners already
  wrote there in dev); added to `.gitignore` now that product images make it a certainty rather
  than an edge case.

---

### Sprint 5 — Transaction core ⚠️ highest risk
**Goal:** a buyer can pay, and the system knows.

- [x] Migrations 005, 006, 009, 011: orders, items, status history, webhook events, digital deliveries,
  outbox, idempotency — migration 009 pulled forward from Sprint 6, see drift below
- [x] `Order` aggregate with the full state machine and transition policy
- [x] `OrderFactory.fromCheckout`, `OrderPricingService`, `HoldingPeriodCalculator`
- [x] Checkout quote + create with `Idempotency-Key`
- [x] Midtrans Snap client, token creation, sandbox wiring — plus a dev stub gateway, see drift below
- [x] Webhook controller: signature verification, raw persist, fast `200`, enqueue
- [x] Webhook processor: dedup, status mapping, `MarkOrderPaid`
- [x] Outbox table, service, and relay in the worker
- [x] BullMQ setup, queues, `expire-orders` job
- [x] Digital delivery provisioning + signed URL issuance + download counting
- [x] Frontend: checkout page, Snap integration, status page with polling
- [x] Tests: state machine, webhook idempotency, outbox durability — not the full exhaustive matrix,
  see drift below

**Deliverable:** end-to-end sandbox purchase of a digital product, with the file downloadable.

> **This sprint carries the most risk in the project.** If anything slips, it is this one. Everything
> downstream depends on the order model being right, so under-delivering here is far cheaper than
> rushing it.

**Status: done.** Verified 2026-08-03 — 53 API unit suites (476 tests, including all 19 actor/transition
combinations that are legal and all 8 explicitly-forbidden state-machine transitions) pass, plus the new
`ordering.int-spec.ts` integration suite (6 tests, real Postgres + Redis, `STORAGE_UPLOADER` overridden
with an in-memory fake so the suite has no external Supabase dependency): checkout creates
`pending_payment` with the correct total and a snapshotted `platform_fee_rate`; a signed-and-verified
webhook settles the order to `paid` → `holding` with the correct `holding_until` and exactly the expected
number of status-history rows; `OrderPaid` lands in and is claimable from the outbox; a duplicate webhook
delivery is marked `ignored` with no extra transition; a late webhook on an already-`expired` order is
rejected; digital delivery provisioning is idempotent on redelivery; a download issues a signed URL and
increments the counter; `Idempotency-Key` replay and conflict semantics both hold; a buyer cannot read
another buyer's order. The three other existing integration suites (`identity`, `store`, `storefront` —
28 tests) still pass after adding the new tables to their cleanup chains. `catalog.int-spec.ts` was
already failing 5/14 tests before this sprint's changes, independent of anything here — the `.env` in
this environment points `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` at a real Supabase project whose
`nagihin-private`/`nagihin-public` buckets return "Bucket not found"; confirmed by running
`catalog.int-spec.ts` unmodified and seeing the identical failure on `DigitalFileService.upload`. Not a
regression from this sprint and not fixed here — it needs the buckets provisioned or the environment
pointed at the filesystem adapter, either of which is outside a single sprint's scope.
`pnpm run lint`, `pnpm run typecheck`, and `pnpm run build` are clean for both `apps/api` and `web`. Live
smoke test: booted both `node dist/main.js` (HTTP API) and `node dist/worker.main.js` (worker) against
the local Docker Postgres/Redis with no Midtrans keys configured — both connect cleanly, every
checkout/payments/delivery route maps, and the worker logs confirm the outbox relay, `expire-orders`, and
job consumers registered with the stub Snap gateway active.

A real bug only surfaced under the integration suite: BullMQ (v6) rejects a `:` character in a custom
job or job-scheduler id, and both `webhook-${event.id}` (was `webhook:${event.id}`) in
`WebhookIngestionService` and the two `REPEATABLE_JOB_IDS` values used `:` as a separator. Fixed to `-`
throughout `shared/infrastructure/queue/`; the unit suite alone would never have caught this since it
never exercises a real `Queue.add()` call.

Decisions and drift from the docs, recorded here rather than silently:
- **The worker is a second entrypoint into `@nagihin/api`, not the separate `apps/worker` package the
  docs describe.** `apps/api/src/worker.main.ts` boots `WorkerModule` via
  `NestFactory.createApplicationContext`; `apps/worker` is deleted, and `docker/Dockerfile.worker` now
  builds `@nagihin/api` and runs `dist/worker.main.js`. Still a separate process/container — the
  event-loop-isolation rationale in `.docs/02-architecture.md` §6 is exactly why a slow PDF render must
  never delay a webhook — it just no longer duplicates config/Prisma/Redis wiring to get it. BullMQ
  `@Processor` classes live in per-module `*-jobs.module.ts` files (`OrderingJobsModule`,
  `PaymentsJobsModule`, `DeliveryJobsModule`, `OutboxRelayModule`) imported only by `WorkerModule`, so
  importing the plain feature module into the HTTP API (for its controllers) never also starts a
  competing job consumer there.
- **Migration 009 (`digital_deliveries`) is pulled forward from Sprint 6 into this sprint's migration
  005/006/009/011 sequence**, matching the scope decision to ship "the file downloadable" as stated in
  the deliverable rather than deferring digital delivery per the risk register's stated fallback.
- **Midtrans is wired through a `PaymentGateway` port** (`ordering/application/ports/payment-gateway.port.ts`,
  owned by the consumer — same dependency-inversion direction as identity's `STORE_LOOKUP`) with two
  adapters: `MidtransSnapGateway` (real Snap API via plain `fetch`, no SDK) and `StubSnapGateway`,
  selected by `AppConfigService.isMidtransConfigured`. `MIDTRANS_SERVER_KEY`/`MIDTRANS_CLIENT_KEY` blank
  (as they are in this environment) selects the stub, whose tokens are prefixed `stub-` so the frontend
  can skip loading the real Snap.js SDK. A dev-only `POST /payments/dev/simulate-webhook` (404s outside
  development or once real keys are set) builds a signature the same way ingestion verifies it — both
  read `config.midtransServerKey`, blank in stub mode — so it exercises the real signature-verification
  code path rather than bypassing it.
- **No ledger and no stock decrement this sprint, as scoped.** `markPaid` moves `paid → holding` and
  computes `holding_until` via `HoldingPeriodCalculator` (which reuses `SettlementPolicy.effectiveHoldUntil`
  from the store module, a pure cross-module VO import — no `balance_transactions` row and no
  `stores.holding_balance` write; that consumer arrives with Sprint 6, reading `OrderPaid` off the
  outbox. Checkout validates stock but does not decrement it (Sprint 11, `StockReservationService` still
  doesn't exist).
- **`webhook_events` gained `transaction_id`/`transaction_status` as real nullable columns**, extracted
  at ingestion, instead of an expression index on the jsonb payload — the Layer-1 dedup lookup
  (`.docs/09-payments-ledger.md` §3) is a plain indexed query rather than a `payload->>'...'` expression.
- **Partial and expression indexes from `.docs/06-database-roadmap.md` §3 are plain Prisma `@@index`
  entries without the `WHERE` predicate** (e.g. `orders(status, holding_until)` has no
  `WHERE status = 'holding'`) — Prisma cannot express partial indexes, and hand-appended raw-SQL
  partial indexes would show as drift on every future `prisma migrate dev`. A sizing optimization, not
  a plan change, worth revisiting once order volume actually warrants it.
- **`OrderNumber` format is `ORD-{yyMMdd}-{6-char base32-ish}`, globally unique**, not per-store —
  unspecified in every doc, but Midtrans requires `order_id` uniqueness per merchant account (all stores
  share one Midtrans account under Model 1 merchant-of-record), so a per-store counter would collide.
- **`GET /checkout/:orderNumber/status`, not `:orderId`** as `.docs/05-api-roadmap.md` §6.1 lists — it's
  keyed by what the Snap `callbacks.finish` URL and the `/checkout/[orderNumber]` route already carry,
  and it serves both the checkout and status pages instead of adding a second `orderId`-keyed endpoint.
  `GET /payments/orders/:orderId` (P1, payment status) was skipped as redundant with it.
- **`/me/orders` is offset paginated, not cursor paginated** as `.docs/05-api-roadmap.md` §17 specifies
  for orders — reuses the existing `Paginated`/`PaginationQueryDto` machinery rather than inventing a
  second pagination contract for one buyer-facing, inherently low-volume endpoint. Cursor pagination
  stays the plan for the seller-facing `/orders` list, deferred this sprint along with `DataTable` and
  `Timeline` — no seller order pages shipped, so nothing needs cursor pagination or row selection yet.
- **`digital_deliveries` gained `@@unique([orderItemId, filePath])`** — a product can carry up to 5
  digital files, so the real grain is one row per file, and this unique key is what makes
  `provision-digital-delivery` idempotent on redelivery.
- Full state-machine and pricing coverage is real (14/14 legal transitions, all explicitly-forbidden
  ones, holding-period floor incl. mixed-basket max-tier and Midtrans-floor cases, fee rounding, discount
  clamping, signature verification, status mapping, idempotency replay/conflict) but is not the doc's
  full row-by-row test matrix in `.docs/08-order-state-machine.md` §7 — `resolveDispute`/refund-recovery
  paths are unit-tested on the aggregate but have no application-service callers or integration coverage
  yet, since nothing in this sprint invokes them (dispute/refund flows are Sprint 11).

---

### Sprint 6 — Money
**Goal:** money is tracked correctly and a record exists.

- [ ] Migrations 007–010: ledger, bank accounts, withdrawals, invoices, deliveries, `store_buyers`
- [ ] `StoreBalance` aggregate with `FOR UPDATE` locking
- [ ] `balance_transactions` append-only writes with balance snapshots
- [ ] `credit-holding-balance` and `release-to-available` jobs
- [ ] `release-holding-balance` scheduler with floor re-check and dispute skip
- [ ] Invoice number generator (per-store counter), HTML template, PDF worker, storage upload
- [ ] Email channel + `NotificationChannel` port + `notification_deliveries` groundwork
- [ ] `store_buyers` upsert on `OrderPaid`, recompute-not-increment
- [ ] Frontend: `/dashboard/keuangan` (balance + holding countdown), `/dashboard/pembeli`, `/dashboard/invoice`
- [ ] Tests: ledger invariants, balance concurrency, invoice idempotency, CRM replay safety

**Deliverable:** a paid order credits holding, releases on schedule, generates an emailed invoice, and
creates a buyer record.

---

### Sprint 7 — Payouts & admin
**Goal:** money can leave, safely.

- [ ] Migration 012: `audit_logs`
- [ ] Bank account CRUD with a single default
- [ ] Withdrawal request: locked balance check, pending-reservation logic, snapshot
- [ ] Admin: approve / reject / mark-paid, with the ledger debit on mark-paid
- [ ] `AuditLogPort` + writes from every mutating context
- [ ] Admin auth, role assignment, admin route tree
- [ ] Buyer `/akun`: order history, order detail, downloads
- [ ] Frontend: `/dashboard/keuangan/penarikan`, `/rekening`, `/admin`, `/admin/penarikan`
- [ ] Tests: withdrawal concurrency, admin RBAC, cross-tenant isolation suite

**Deliverable:** a seller requests a withdrawal, an admin approves and marks it paid, and the ledger
balances.

---

### Sprint 8 — Thin MVP launch
**Goal:** a real seller, a real transaction, real money.

- [ ] Dashboard summary cards + revenue report
- [ ] Every empty, loading, and error state across the app
- [ ] Mobile responsiveness pass on the whole dashboard
- [ ] Production Midtrans account, live keys, production webhook URL
- [ ] Production checklist ([13 §3](./13-devops-testing-prod.md#3-production-checklist))
- [ ] Sentry, uptime monitoring, alert routing
- [ ] Terms of service + privacy policy pages
- [ ] Backup verification: restore drill from PITR
- [ ] Seller onboarding guide
- [ ] Load-test the storefront path
- [ ] **Pilot with 1–3 friendly sellers**

**Deliverable:** live product, first real transaction, first real withdrawal.

---

### Sprint 9 — Path B
- [ ] Migration 013: `inquiries` + `orders.inquiry_id`
- [ ] `Inquiry` aggregate, creation from the storefront, WA deep link with pre-filled message
- [ ] Manual order creation with price override and buyer-by-email
- [ ] Manual payment confirmation
- [ ] Inquiry → order conversion, mark lost
- [ ] WhatsApp channel implementation (Fonnte/Wablas) behind the port
- [ ] Frontend: `/dashboard/pesanan/manual`, `/dashboard/pesanan/pertanyaan`, live Tanya button

**Deliverable:** the chat-first flow works end to end and lands buyers in the database.

### Sprint 10 — Promotions
- [ ] Migration 014: promotions, scope, redemptions
- [ ] `Promotion` aggregate, validator, discount calculator with subtotal clamp
- [ ] Usage limits (total + per buyer), redemption on paid, release on refund
- [ ] Auto-apply `?promo=` links + share-link generator
- [ ] Below-HPP margin warning (advisory)
- [ ] Frontend: `/dashboard/promosi`, storefront promo preview

### Sprint 11 — Physical & disputes
- [ ] Migrations 015, 016: shipping fields, `refunds`
- [ ] Shipping input, `recompute-holding-until` from `shipped_at`
- [ ] Stock decrement on paid, restore on cancel/expire
- [ ] Dispute raise (buyer + seller), funds freeze, release-job skip
- [ ] Refund flow across all three fund positions, incl. `requires_manual_recovery`
- [ ] Admin dispute queue and resolution
- [ ] Frontend: shipping form, dispute dialog, `/admin/sengketa`

### Sprint 12 — Operations
- [ ] Migrations 017, 018: notification deliveries, settlement reports, reconciliation runs
- [ ] Daily settlement fetch + three-way reconciliation + mismatch alerts
- [ ] Weekly balance verification + drift alerts
- [ ] Notification delivery log + retry job
- [ ] Admin: reconciliation dashboard, webhook inspection + reprocess, audit viewer
- [ ] Dead-letter queue monitoring and alerting

### Sprint 13 — Reporting depth
- [ ] Gross profit from HPP snapshots (with the "never join products" test)
- [ ] Per-product performance, charts, date ranges
- [ ] CRM: buyer detail, tags, notes, CSV export
- [ ] Inquiry follow-up analytics
- [ ] Frontend: `/dashboard/laporan`, `/dashboard/pembeli/[id]`

### Sprint 14 — Monetization
- [ ] Migration 019: subscriptions, subscription invoices
- [ ] `Subscription` aggregate, plan resolution, `PlanFeatureResolver`
- [ ] Server-side feature gating on every Pro feature
- [ ] Subscribe flow via Midtrans, recurring charge job, dunning
- [ ] Fee rate differentiation (5% free / 2.5% pro)
- [ ] Frontend: `/harga`, `/dashboard/pengaturan/langganan`

---

## 3. Developer task list

### Backend

**Foundation**
- [x] pnpm workspace, `apps/api`, `packages/contracts` — `apps/worker` merged into `apps/api` as a
  second entrypoint (`src/worker.main.ts`) in Sprint 5; see that sprint's drift notes
- [x] Typed config module with boot-time env validation
- [x] Pino logger with request correlation IDs
- [x] Global `ValidationPipe`, `DomainExceptionFilter`, `PrismaExceptionFilter`
- [x] `Result<T,E>`, base entity/aggregate/VO/domain-event classes
- [x] `Money` value object. `Email`/`Phone`/`Username`/`Slug` deferred to the modules that need them (Sprint 2+)
- [x] `TransactionManager` with AsyncLocalStorage (wired, unused until the first repository lands)
- [x] `PrismaService` with pooler/direct connection split — moot since Sprint 5's worker merge: both
  entrypoints now share one `PrismaService` on `DATABASE_URL`
- [x] Redis module — typed cache wrapper deferred until a consumer needs it
- [x] BullMQ registration, queue names, typed payloads
- [x] Outbox service, table, and relay
- [x] Idempotency store + interceptor
- [x] Supabase Storage service (upload, signed URL) — plus a filesystem dev adapter and a null
  adapter behind the same `StorageUploader` port
- [x] Health indicators: Postgres, Redis, Storage
- [x] Typed cache wrapper (`shared/infrastructure/cache/`) and in-process domain event publisher
  (`shared/infrastructure/events/`) — Sprint 3, ahead of the Sprint 5 outbox

**Identity**
- [x] `User` aggregate + `RefreshToken` entity + `VerificationToken` repository + mapper
- [x] Google OAuth service with PKCE and state
- [x] Password service: Argon2id hashing, register, login, email verification, forgot/reset
- [x] Minimal `EmailSender` (Resend) for verification + reset emails
- [x] `AccountLinkingService`: link/unlink Google, set password, retain-one-method invariant
- [x] JWT service (RS256, key rotation via `kid`)
- [x] Rotation service with family reuse detection
- [x] `JwtAuthGuard`, `RolesGuard`, `@CurrentUser`, `@Public`, `@Roles`
- [x] Auth + user controllers

**Store / Catalog**
- [x] `Store` aggregate, `SettlementPolicy` VO, username service with blocklist
- [x] `Product` aggregate, `ProductRiskTierResolver`
- [x] Storefront read repository + cache invalidation on events

**Ordering**
- [x] `Order` aggregate with all guarded transitions (`markPaid`/`cancel`/`expire`/`release`/`dispute`/
  `refund` — `release`/`dispute`/`refund` are unit-tested but have no application-service caller yet;
  dispute/refund flows land in Sprint 11)
- [x] `OrderTransitionPolicy` as a data table
- [x] `HoldingPeriodCalculator` (max risk tier + Midtrans floor)
- [x] `OrderPricingService`
- [x] `OrderFactory` (checkout only — manual creation is Sprint 9)
- [ ] `Inquiry` aggregate — Sprint 9
- [x] Application services for the transitions this sprint calls: `CheckoutService`, `MarkOrderPaidService`,
  `CancelOrderService`, `ExpireOrderService` (not one handler per transition — see the module's
  `application/services/` convention, matching the rest of the codebase's style, not a CQRS command bus)
- [x] `OrderReadRepository` with raw SQL (buyer-facing list only; the seller-facing list is deferred with
  `/dashboard/pesanan`)

**Payments**
- [x] Midtrans Snap client (Core API / refunds deferred to when refunds ship, Sprint 11)
- [x] `SignatureVerifier` (constant-time compare)
- [x] Webhook controller + ingestion service
- [x] `PaymentStatusMapper` incl. `capture`+`challenge`
- [x] Webhook processor with dedup
- [ ] Refund service — Sprint 11
- [ ] Reconciliation service (three-way match) — Sprint 12

**Ledger**
- [ ] `StoreBalance` aggregate with row locking
- [ ] Ledger service; private balance mutation
- [ ] Withdrawal service with pending-reservation logic
- [ ] Bank account service
- [ ] `BalanceReconciler`
- [ ] Platform revenue + seller liability calculators

**Supporting**
- [ ] Invoice number generator, renderer, delivery service — Sprint 6
- [x] Digital delivery service, signed URL issuer, download policy
- [ ] `StoreBuyer` service with recompute-on-event
- [ ] `Promotion` aggregate, validator, calculator
- [ ] `NotificationChannel` port, email adapter, WhatsApp adapter, dispatcher
- [ ] `AuditLogPort` + service
- [ ] Reporting read repositories
- [ ] Admin services

### Frontend

- [x] Next.js App Router with route groups (placeholder pages; real content lands sprint-by-sprint)
- [x] Tailwind + shadcn init, theme tokens, dark mode without flash
- [x] Typed API client with auth interceptor and single-flight refresh, plus a separate server-only
  fetcher (`lib/api/server-client.ts`, zod-validated) for SSR reads
- [x] TanStack Query provider, per-feature query keys
- [x] Auth store (Zustand, memory only), middleware guard
- [ ] Layout shells: marketing, storefront, dashboard, admin, buyer — dashboard and storefront shells
  done; marketing, admin, buyer still placeholders
- [ ] `DataTable` with responsive card fallback — still deferred: no seller order list shipped this
  sprint either (`/dashboard/pesanan` is Sprint 6+), so there is still nothing that needs cursor
  pagination + row selection; the buyer-facing order/delivery lists use the same card layout
- [x] `EmptyState` / `ErrorState` / skeleton set
- [x] `MoneyDisplay`, `MoneyInput` (bigint-safe)
- [x] `OrderStatusBadge` — `Timeline`, `HoldingCountdown`, `BalanceCard` wait for Sprint 6 seller pages
- [x] `ImageUploader`, `FileUploader`, `UsernameInput`, `PhoneInput` — `ImageUploader` genericized
  in Sprint 4 (was hardcoded to `Store`); `FileUploader` done; `PhoneInput` lands with Sprint 9
- [x] Storefront pages (SSR), product page, `BuyWhatsAppButtons` — Beli now creates a real order and
  redirects to checkout; Tanya stays inert until Sprint 9 as documented
- [x] Checkout + Snap integration + status polling
- [ ] Every dashboard page from [11 §2](./11-frontend.md#2-page-inventory) — `toko` and `pengaturan`
  done, the rest land sprint-by-sprint (no seller order pages this sprint — see drift notes)
- [x] Buyer `/akun` pages — order history, order detail, downloads; profile settings still a placeholder
- [ ] Admin pages
- [ ] `InvoicePreview` shared with the PDF renderer
- [ ] Charts (dynamically imported)
- [ ] Mobile pass on every screen

### DevOps

- [x] `Dockerfile.api`, `Dockerfile.worker` (multi-stage, non-root, Node 22) — both build `@nagihin/api`
  since Sprint 5's worker merge; `Dockerfile.worker` runs `dist/worker.main.js`
- [x] `docker-compose.yml` for local development
- [x] `.env.example` with every Sprint 1 variable documented (remaining variables land with the modules that need them)
- [x] GitHub Actions: lint, typecheck, unit, build. Integration job deferred — Sprint 2 (first Postgres-backed module)
- [ ] Deploy pipeline: self-hosted VPS for API + worker, Vercel or VPS for web — deferred until the VPS is provisioned
- [ ] Staging environment with a separate Supabase project — not applicable as scoped; Postgres is self-hosted, revisit if staging needs its own DB instance
- [ ] Sentry (API, worker, web)
- [ ] Uptime monitoring on `/health/ready`
- [ ] Log aggregation
- [ ] Secrets in the platform's secret store, never in the repo
- [ ] Nightly `pg_dump` to object storage + restore drill
- [ ] Alert routing for critical queues and reconciliation

### Database

- [ ] Migrations 001–019 in order (001–004, 005, 006, 009, 011 done — 009 pulled forward from Sprint 6;
  007/008/010 (ledger, invoicing, `store_buyers`) still land in Sprint 6, 012+ later)
- [x] Check constraints from [06 §4](./06-database-roadmap.md#4-constraints) for the tables this sprint
  added (orders, order_items, digital_deliveries) — partial-index predicates are plain non-partial
  `@@index` entries, see this sprint's drift notes
- [x] Indexes from [06 §3](./06-database-roadmap.md#3-indexes) for the tables this sprint added, same
  partial-index caveat
- [x] `seed/base.ts` (idempotent, production-safe) — no-op stub until Sprint 3 needs reserved usernames
- [ ] `seed/dev.ts` generating data through domain commands
- [ ] `seed/test.ts` minimal fixtures

### Testing

- [x] Unit: every value object added this sprint (`OrderNumber`, `OrderStatus`, `PlatformFee`,
  `DiscountApplication`, `DownloadAllowance`, `StatusChangeActor`)
- [x] Unit: `Order` state machine — all 14 legal transitions (19 actor combinations) + all 8
  explicitly-forbidden ones
- [x] Unit: `HoldingPeriodCalculator` incl. mixed baskets and the Midtrans floor
- [x] Unit: `OrderPricingService`, discount clamping
- [ ] Unit: ledger invariants — Sprint 6
- [x] Integration: repositories against a real Postgres container (`ordering.int-spec.ts`)
- [x] Integration: webhook idempotency (duplicate delivery)
- [ ] Integration: balance concurrency (parallel withdrawals) — Sprint 6/7
- [x] Integration: outbox durability (`OrderPaid` committed with the state change, claimable by the relay)
- [x] Integration: cross-tenant isolation for the ordering/delivery endpoints this sprint added — not yet
  **every** seller endpoint per the doc's full ambition, since no seller order endpoints exist yet
- [ ] Integration: gross profit never joins `products` — Sprint 13
- [ ] E2E: signup → store → product → checkout → invoice → download — invoice is Sprint 6; the
  integration suite covers signup-adjacent → store → product → checkout → webhook → download today
- [ ] E2E: withdrawal request → admin approve → mark paid — Sprint 7
- [x] Architecture test: no framework imports in `domain/` — `ordering`/`payments`/`delivery` domain
  layers pass the existing `architecture.spec.ts` fitness test unmodified

---

## 4. The Thin MVP cut line

`summary.md` assumes 1–2 months for the MVP. **At ~10–12 hours per week, Sprint 8 lands roughly 16 weeks
out.** That is the honest number, and planning against 8 weeks would mean either shipping money-handling
code that has not been tested properly, or discovering the slip in month three.

Two ways to compress, both legitimate:

### Option A — more hours

Full-time (≈40h/week) compresses the same scope to roughly 5 sprints / 10 weeks. Nothing is cut; the
sequencing is unchanged.

### Option B — cut scope to Sprint 6

Ship after **Sprint 6** at ~12 weeks, with a deliberately narrow product:

**In:** Google auth · store + storefront · digital products only · Path A checkout · Midtrans ·
order state machine · ledger · invoice by email · buyer database · digital delivery

**Out, and handled manually:** withdrawals (calculate and transfer by hand for the first sellers, then
build Sprint 7) · admin dashboard (query the database directly) · reports (the dashboard cards suffice)

This works only because the first weeks have single-digit sellers. Manually transferring to three sellers
weekly is perhaps 30 minutes; building the withdrawal UI is a sprint. **The ledger is not optional
in this cut** — manual payouts still need a correct record of what is owed, and retrofitting a ledger onto
live money data is one of the worst migrations in software.

### What must never be cut

| Never cut | Why |
|---|---|
| The ledger | Retrofitting onto live money data is near-impossible to do safely |
| Webhook idempotency | Duplicate credits are the most expensive bug available |
| `store_buyers` capture | Missed data is permanently missed; it is the entire moat |
| Order state machine | Adding states to a live orders table with money attached is brutal |
| Order snapshots | Historical reports become wrong the first time a price changes |
| Audit trail | Dispute investigation is impossible without it |

Everything else is negotiable. These six are the load-bearing walls.

---

## 5. Risk register

| Risk | P | Impact | Mitigation |
|---|---|---|---|
| Sprint 5 overruns | High | Everything slips | Timebox to sandbox-only; move digital delivery to Sprint 6 if needed |
| Midtrans production approval is slow | Medium | Blocks launch | Start the merchant application during Sprint 3 |
| MDR makes 5% unprofitable | Medium | Business model | Get real rates before Sprint 8; fee logic is already per-order and channel-aware |
| WA provider terminated | Medium | Feature loss | Port abstraction; email is the guaranteed channel |
| Part-time capacity drops | High | Slip | Option B cut line is pre-agreed, not an emergency decision |
| Supabase Postgres 18 unavailable | Low | None | UUIDv7 generated in application code |
| Scope creep from seller feedback | High | Slip | P0/P1/P2 tiers are the answer; feedback lands in P1+, not in the current sprint |
| Solo bus factor | High | Project halts | These documents; conventional technology; no clever code |

---

Next: [13 — DevOps, Testing & Production](./13-devops-testing-prod.md)
