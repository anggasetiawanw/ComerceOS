# 06 — Database Roadmap

[`../database-schema.md`](../database-schema.md) remains the specification for the 21 tables it defines.
This document covers what it does not: migration sequencing, the amendments found while cross-reading it
against `user-behavior.md`, index and constraint strategy, seeding, and performance posture.

---

## 1. Migration order

Migrations are additive and ordered by foreign-key dependency. Each is a separate Prisma migration so
that any one can be reviewed, and so the sequence maps onto the sprint plan.

| # | Migration | Tables | Depends on | Sprint |
|---|---|---|---|---|
| 001 | `init_extensions` | `pgcrypto`, `citext` | — | 1 |
| 002 | `identity` | `users`, `refresh_tokens`, `verification_tokens` | 001 | 2 |
| 003 | `store` | `stores`, `social_links` | 002 | 3 |
| 004 | `catalog` | `products`, `digital_files` | 003 | 4 |
| 005 | `ordering` | `orders`, `order_items`, `order_status_history` | 004 | 5 |
| 006 | `payments` | `webhook_events` | 005 | 5 |
| 007 | `ledger` | `balance_transactions`, `bank_accounts`, `withdrawals` | 005 | 6 |
| 008 | `invoicing` | `invoices` | 005 | 6 |
| 009 | `delivery` | `digital_deliveries` | 005 | 6 |
| 010 | `crm` | `store_buyers` | 005 | 6 |
| 011 | `infrastructure` | `outbox_events`, `idempotency_keys` | 001 | 5 |
| 012 | `administration` | `audit_logs` | 002 | 7 |
| 013 | `inquiries` | `inquiries` + `orders.inquiry_id` FK | 005 | 9 |
| 014 | `promotions` | `promotions`, `promotion_products`, `promotion_redemptions` | 004, 005 | 10 |
| 015 | `shipping` | `orders.shipped_at`, `tracking_number`, `courier` | 005 | 11 |
| 016 | `refunds` | `refunds` | 006 | 11 |
| 017 | `notifications` | `notification_deliveries` | 002 | 12 |
| 018 | `reconciliation` | `settlement_reports`, `reconciliation_runs` | 006 | 12 |
| 019 | `billing` | `subscriptions`, `subscription_invoices` | 003 | 14 |

**Migration 011 lands with 005, not before.** The outbox is only meaningful once there are domain events
to relay, and pairing it with the first money-adjacent tables makes the reason for it obvious in review.

`inquiries` is deferred to 013 despite appearing early in the schema document, because Path B is P1. The
FK on `orders.inquiry_id` is added at that point — an `ALTER TABLE ADD COLUMN` with a nullable FK, which
is a non-blocking operation on Postgres.

### Rules

- **Never edit an applied migration.** Corrections are new migrations, always.
- **Every migration must be reversible in principle**, even though Prisma does not auto-generate `down`.
  Write the rollback SQL in a comment header. On production money data, "how do I undo this" is not a
  question to answer under pressure.
- **Adding a `NOT NULL` column to a populated table is a three-step dance:** add nullable → backfill →
  set `NOT NULL`. Never one step on a table with rows.
- **Migrations run from a direct connection**, never through the Supabase transaction pooler, which does
  not support the session-level statements DDL needs.

---

## 2. Schema amendments

Found by cross-reading `database-schema.md` against `user-behavior.md`. Each is a gap between what the
behavior document promises and what the schema can express.

### 2.1 `inquiry` is not an order status — clarification, no change

`user-behavior.md` §4 lists `inquiry` as the first state of the order state machine, while the schema
correctly models inquiries as a separate table. **The schema is right.**

An inquiry has no money, no items, no buyer commitment, and frequently never becomes an order. Putting
it in the `orders` table would mean every money query, every ledger join, and every revenue report would
have to remember to exclude it — and one day something would forget. `orders.status` therefore excludes
`inquiry`; `inquiries` has its own `open` / `converted` / `lost` lifecycle, linked by
`orders.inquiry_id` and `inquiries.converted_order_id`. Recorded as [AD-08](./README.md#decision-log).

### 2.2 `refresh_tokens` — new table

JWT refresh rotation with reuse detection needs server-side state. Without it there is no revocation, no
"sign out other devices", and no way to respond to a stolen token.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid fk → users | |
| `token_hash` | text | SHA-256 of the token. Never store the token itself |
| `family_id` | uuid | Rotation lineage; reuse revokes the whole family |
| `expires_at` | timestamptz | |
| `revoked_at` | timestamptz null | |
| `replaced_by_id` | uuid null | Rotation chain |
| `user_agent` / `ip` | text null | Session display |
| `created_at` | timestamptz | |

### 2.3 `users.role` — new column

The schema has no way to express who is an admin. `role enum('buyer','seller','admin') default 'buyer'`.

`buyer` and `seller` are largely informational — a user becomes a seller by owning a store, which is the
real authorization check. `admin` is the one that matters, and it is deliberately a coarse boolean-ish
flag rather than a permission system: at MVP there is one admin. See [07 §4](./07-auth.md#4-rbac).

### 2.4 `bank_accounts` — new table

The schema snapshots bank details onto `withdrawals` but has nowhere to *store* them, so a seller would
re-type their account number on every request — an error-prone step on the one operation where a typo
sends money to a stranger.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `store_id` | uuid fk | |
| `bank_code` / `bank_name` | text | |
| `account_number` | text | |
| `account_holder_name` | text | |
| `is_default` | boolean | Partial unique: one default per store |
| `verified_at` | timestamptz null | Reserved for future name-match verification |
| `created_at` | timestamptz | |

The snapshot on `withdrawals` stays — it must remain accurate even if the account is later edited.

### 2.5 Shipping fields on `orders` — new columns

`user-behavior.md` §5 sets the physical-goods holding period as "T+3 from `paid`, **or from shipped if
tracking is entered**". The schema cannot record shipping, so that rule is currently unimplementable.

`shipped_at timestamptz null`, `tracking_number text null`, `courier text null`.

### 2.6 Mixed-basket holding rule — invariant, no column

`order_items` supports multiple products of different types, but nothing defines the holding period for
a basket containing both a digital and a physical item.

**Rule: the holding period is the maximum risk tier across all items.** One physical item makes the whole
order T+3. Per-item release would require splitting ledger entries per line, which multiplies the ledger's
complexity to solve a rare case. Recorded as [AD-09](./README.md#decision-log), enforced by
`HoldingPeriodCalculator` ([04 §4](./04-entity-design.md#4-ordering--tier-1-full-ddd--cqrs)).

### 2.7 Download entitlement vs URL expiry — clarification, no change

`digital_deliveries.expires_at` reads as an entitlement deadline, which would contradict
`user-behavior.md` §11's promise that buyers can re-download from `/akun`.

**Interpretation: `expires_at` bounds the signed URL window, not the entitlement.** The entitlement ends
when `download_count >= max_downloads`. A buyer returning after expiry gets a freshly signed URL if
allowance remains. No schema change; a comment in the Prisma schema and a test that asserts it.

### 2.8 `refunds` — new table

Refunds appear in the state machine and in the ledger enum, but nothing records the refund itself: who
initiated it, whether the gateway call succeeded, what the Midtrans refund reference was.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `order_id` | uuid fk | |
| `amount` | bigint | Partial refunds supported later |
| `reason` | text | |
| `initiated_by_type` | enum(`seller`,`admin`,`system`) | |
| `initiated_by_id` | uuid null | |
| `status` | enum(`pending`,`completed`,`failed`) | |
| `midtrans_refund_id` | text null | |
| `requires_manual_recovery` | boolean | True when funds were already released — the case `user-behavior.md` §6 flags as out of system control |
| `created_at` / `completed_at` | timestamptz | |

`requires_manual_recovery` is the honest encoding of the §6 scenario. The system cannot claw back released
funds; it can at least *flag* that a human must.

### 2.9 `settlement_reports` + `reconciliation_runs` — new tables

`user-behavior.md` §13 makes daily reconciliation mandatory from MVP. Reconciliation without a persisted
result is a script someone runs and forgets — the mismatch needs to survive as a work item.

`settlement_reports`: one row per Midtrans settlement line (`transaction_id`, `gross_amount`,
`settlement_date`, `payment_type`, `raw` jsonb).

`reconciliation_runs`: one row per daily run — `run_date`, `matched_count`, `mismatch_count`,
`mismatches` jsonb, `status`, `resolved_at`.

### 2.10 `notification_deliveries` — new table

WA delivery over a grey-area provider *will* fail. Without a delivery log there is no way to answer
"did this seller get their invoice", which is the first question every support conversation opens with.

`channel`, `provider`, `recipient`, `template`, `payload` jsonb, `status`
(`pending`/`sent`/`failed`/`skipped`), `attempts`, `error_message`, `sent_at`.

### 2.11 `outbox_events` — new table

The transactional outbox ([AD-05](./README.md#decision-log)).

`aggregate_type`, `aggregate_id`, `event_type`, `payload` jsonb, `status`
(`pending`/`processing`/`published`/`failed`), `attempts`, `available_at`, `published_at`, `error`.

Index: `(status, available_at)` — the relay's only query.

### 2.12 `idempotency_keys` — new table

`key`, `user_id`, `endpoint`, `request_hash`, `response_status`, `response_body` jsonb, `created_at`,
`expires_at`. Unique on `(key, user_id)`.

### 2.13 Money columns: `numeric` → `bigint`

`database-schema.md` specifies `numeric` for all money. **Recommend `bigint` rupiah integers instead**
([AD-04](./README.md#decision-log)).

| | `numeric` | `bigint` |
|---|---|---|
| Precision | Exact | Exact |
| JS mapping in Prisma | `Decimal` (Decimal.js) | `BigInt` |
| Sub-rupiah amounts | Possible — and undesirable | Impossible by construction |
| Fee arithmetic | Produces fractional rupiah needing a rounding policy at every call site | Rounds once, explicitly, in `Money` |
| Sum performance | Slower | Faster |
| Risk | Someone eventually does `Number(decimal)` and loses precision | `BigInt` throws on implicit coercion — the bug announces itself |

Rupiah has no circulating sub-unit. A 5% fee on Rp10.000 is Rp500; on Rp9.999 it is Rp499.95, which
must become an integer at some point regardless — so decide the rounding rule once, in `Money.percentage()`
(round half up, favoring the platform on fees and the seller on payouts), rather than at fifteen call sites.

Applies to: `orders.subtotal/discount_amount/total/platform_fee_amount`, `order_items.price_snapshot/hpp_snapshot`,
`products.price/hpp`, `stores.holding_balance/available_balance`, `balance_transactions.amount/*_after`,
`withdrawals.amount`, `promotions.value/min_purchase`, `subscriptions.price`, `subscription_invoices.amount`,
`refunds.amount`. `platform_fee_rate` stays `numeric(5,4)` — it is a rate, not money.

### 2.14 `stores.invoice_counter` — new column

Gapless per-store invoice numbering ([04 §7](./04-entity-design.md#7-invoicing--tier-2)) needs a counter
that increments under a row lock inside the invoice transaction. `COUNT(*) + 1` races; a global sequence
leaks total platform volume to every seller who reads their own invoice number.

### 2.15 Password authentication — new columns + table

[AD-13](./README.md#decision-log) adds email/password as a second login method alongside Google
([07 §1a–1b](./07-auth.md#1a-email--password-registration-and-login)). `users` gains:

| Column | Type | Notes |
|---|---|---|
| `google_id` | text, unique, **nullable** | Was implicitly required; now optional since a user may authenticate by password only |
| `password_hash` | text, nullable | Argon2id hash. Null for Google-only accounts |
| `email_verified_at` | timestamptz, nullable | Set immediately for Google accounts; set by `/auth/verify-email` for password accounts |

`CHECK (google_id IS NOT NULL OR password_hash IS NOT NULL)` — a user must always retain at least one
login method. This is also what makes `DELETE /auth/google/unlink` safe to gate on `password_hash`
already being set.

New table, mirroring the existing hash-at-rest pattern used by `refresh_tokens`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid fk → users | |
| `token_hash` | text, unique | SHA-256 of the emailed token, never store the raw value |
| `purpose` | enum(`email_verification`,`password_reset`) | |
| `expires_at` | timestamptz | 24h for verification, 1h for reset |
| `used_at` | timestamptz null | Single-use |
| `created_at` | timestamptz | |

### 2.16 Summary

| # | Amendment | Type | Migration |
|---|---|---|---|
| 1 | `inquiry` excluded from order status | Clarification | — |
| 2 | `refresh_tokens` | New table | 002 |
| 3 | `users.role` | New column | 002 |
| 4 | `bank_accounts` | New table | 007 |
| 5 | Shipping fields on `orders` | New columns | 015 |
| 6 | Max-risk-tier holding rule | Invariant | — |
| 7 | Download entitlement clarification | Clarification | — |
| 8 | `refunds` | New table | 016 |
| 9 | `settlement_reports`, `reconciliation_runs` | New tables | 018 |
| 10 | `notification_deliveries` | New table | 017 |
| 11 | `outbox_events` | New table | 011 |
| 12 | `idempotency_keys` | New table | 011 |
| 13 | Money as `bigint` | Type change | all |
| 14 | `stores.invoice_counter` | New column | 003 |
| 15 | Password auth: `users.password_hash`/`email_verified_at`, nullable `google_id`, `verification_tokens` | New columns + table | 002 |

---

## 3. Indexes

`database-schema.md` already specifies the unique constraints. These are the access-path indexes,
each justified by a query that exists in [05](./05-api-roadmap.md).

### Uniques (from the schema, restated)

```sql
CREATE UNIQUE INDEX ON stores (username);
CREATE UNIQUE INDEX ON products (store_id, slug);
CREATE UNIQUE INDEX ON orders (order_number);
CREATE UNIQUE INDEX ON promotions (store_id, code);
CREATE UNIQUE INDEX ON store_buyers (store_id, buyer_id);
CREATE UNIQUE INDEX ON invoices (order_id);
CREATE UNIQUE INDEX ON subscriptions (store_id) WHERE status IN ('active','trialing');
CREATE UNIQUE INDEX ON bank_accounts (store_id) WHERE is_default;
CREATE UNIQUE INDEX ON idempotency_keys (key, user_id);
CREATE UNIQUE INDEX ON refresh_tokens (token_hash);
CREATE UNIQUE INDEX ON verification_tokens (token_hash);
```

### Access paths

| Index | Serves |
|---|---|
| `orders (store_id, created_at DESC)` | Seller order list — the most-hit dashboard query |
| `orders (store_id, status, created_at DESC)` | Status-filtered list |
| `orders (buyer_id, created_at DESC)` | Buyer `/akun` history |
| `orders (status, holding_until) WHERE status = 'holding'` | Release scheduler. Partial — the job only ever scans holding orders, and this keeps the index tiny |
| `orders (status, created_at) WHERE status = 'pending_payment'` | Expiry scheduler |
| `orders (midtrans_transaction_id) WHERE midtrans_transaction_id IS NOT NULL` | Webhook → order lookup |
| `order_items (order_id)` | Aggregate load |
| `order_items (product_id, created_at)` | Product performance report |
| `order_status_history (order_id, created_at)` | Dispute investigation |
| `balance_transactions (store_id, created_at DESC)` | Ledger history + reconciliation sums |
| `balance_transactions (order_id)` | Order detail's money trail |
| `store_buyers (store_id, last_purchase_at DESC)` | CRM default sort |
| `store_buyers (store_id, total_spent DESC)` | CRM sort by value |
| `products (store_id, status)` | Storefront + dashboard listing |
| `webhook_events (source, (payload->>'transaction_id'))` | Reconciliation lookup — from the schema, non-unique by design |
| `webhook_events (status, received_at) WHERE status IN ('received','failed')` | Retry scan |
| `outbox_events (status, available_at) WHERE status = 'pending'` | Relay poll — the hottest small query in the system |
| `promotion_redemptions (promotion_id, buyer_id)` | Per-buyer limit enforcement |
| `inquiries (store_id, status, created_at DESC)` | Inquiry follow-up list |
| `audit_logs (entity_type, entity_id, created_at DESC)` | Entity audit trail |
| `audit_logs (actor_id, created_at DESC)` | Actor audit trail |
| `withdrawals (status, requested_at)` | Admin queue |
| `notification_deliveries (status, created_at) WHERE status = 'failed'` | Retry scan |
| `verification_tokens (user_id, purpose)` | Invalidate outstanding tokens when a new one is issued |

**Partial indexes wherever a job scans a minority state.** The release scheduler runs every few minutes
forever; an index covering only `holding` rows stays small permanently, while a full index on
`(status, holding_until)` grows with every completed order the job will never look at again.

### Deliberately not indexed

- `users.phone` — no lookup path by phone; login is by Google or email/password, never phone
- `order_items.hpp_snapshot` — aggregated, never filtered
- Any single-column index on a low-cardinality enum alone — always paired with a discriminating column

---

## 4. Constraints

Database-level guarantees. The domain enforces these too, but a constraint is what stops a bad migration,
a support script, or a bug in a future code path from persisting corrupt money data.

```sql
-- Money is never negative where it cannot be
ALTER TABLE orders            ADD CHECK (subtotal >= 0 AND total >= 0 AND discount_amount >= 0);
ALTER TABLE orders            ADD CHECK (discount_amount <= subtotal);
ALTER TABLE orders            ADD CHECK (platform_fee_rate >= 0 AND platform_fee_rate <= 1);
ALTER TABLE stores            ADD CHECK (holding_balance >= 0 AND available_balance >= 0);
ALTER TABLE withdrawals       ADD CHECK (amount > 0);
ALTER TABLE order_items       ADD CHECK (qty > 0 AND price_snapshot >= 0);
ALTER TABLE products          ADD CHECK (price >= 0 AND (hpp IS NULL OR hpp >= 0));
ALTER TABLE products          ADD CHECK (stock IS NULL OR stock >= 0);

-- State machine timestamps must be coherent
ALTER TABLE orders ADD CHECK (released_at IS NULL OR paid_at IS NOT NULL);
ALTER TABLE orders ADD CHECK (released_at IS NULL OR released_at >= paid_at);
ALTER TABLE orders ADD CHECK (holding_until IS NULL OR paid_at IS NOT NULL);

-- Status/timestamp agreement
ALTER TABLE orders ADD CHECK (status <> 'released' OR released_at IS NOT NULL);
ALTER TABLE orders ADD CHECK (status NOT IN ('paid','holding','released') OR paid_at IS NOT NULL);

-- Promotions
ALTER TABLE promotions ADD CHECK (valid_until IS NULL OR valid_until > valid_from);
ALTER TABLE promotions ADD CHECK (type <> 'percent' OR (value > 0 AND value <= 100));

-- Delivery
ALTER TABLE digital_deliveries ADD CHECK (download_count >= 0 AND download_count <= max_downloads);

-- Identity: a user must always retain at least one login method
ALTER TABLE users ADD CHECK (google_id IS NOT NULL OR password_hash IS NOT NULL);
```

**Foreign key delete behavior:**

| Relationship | Behavior | Why |
|---|---|---|
| `orders → users` | `RESTRICT` | A user with orders cannot be deleted — the financial record must survive |
| `orders → stores` | `RESTRICT` | Same |
| `order_items → products` | `RESTRICT` | Products archive, never delete |
| `order_items → orders` | `CASCADE` | Items belong to the aggregate |
| `digital_files → products` | `CASCADE` | |
| `social_links → stores` | `CASCADE` | |
| `balance_transactions → *` | `RESTRICT` | The ledger is immutable |
| `refresh_tokens → users` | `CASCADE` | |
| `store_buyers → users` | `RESTRICT` | |

The pattern: **anything financial restricts; anything presentational cascades.** A `CASCADE` that reaches
the ledger would let one careless delete erase an audit trail.

---

## 5. Seed strategy

Three seed sets, run by environment.

### `seed/base.ts` — every environment including production

- Reserved usernames blocklist: `admin`, `api`, `app`, `auth`, `www`, `support`, `help`, `about`,
  `terms`, `privacy`, `login`, `signup`, `dashboard`, `akun`, `settings`, `checkout`, `nagihin`, plus
  common profanity. **Must exist before the first user signs up** — reclaiming a taken username later is
  a support conversation nobody wants.
- Plan definitions: free (5%), pro (2.5% + monthly price)
- Bank code reference list (Indonesian banks + e-wallets)

### `seed/dev.ts` — local and staging only

- 3 users: seller, buyer, admin
- 1 store `@tokodemo` with profile and social links
- 6 products spanning all three types, with HPP and digital files
- 12 orders spread across every status, so every UI state is reachable without manual setup
- Ledger entries consistent with those orders — *generated by replaying the real domain commands*, not
  inserted directly. Hand-written ledger seed data drifts from what the code actually produces, and then
  the seed becomes a source of false confidence
- 2 promotions, 4 inquiries, 1 pending withdrawal

### `seed/test.ts` — integration tests

Minimal fixtures; each test builds its own state through the domain.

**Production seeding runs `base.ts` only, and is idempotent** (upsert by natural key) so a redeploy is safe.

---

## 6. Performance

At MVP scale (hundreds of orders/day) Postgres will not be the bottleneck. These are the things that
would still hurt at that scale, plus the ones that bite at 10×.

### Now

| Concern | Approach |
|---|---|
| Public storefront traffic spikes | Redis cache, 60s TTL, invalidated on product/store events. The viral-TikTok-link scenario must not reach Postgres |
| N+1 on order lists | `OrderReadRepository` with a single `$queryRaw` join, never aggregate hydration in a loop |
| Connection exhaustion | Supabase transaction pooler for the API; direct connection for the worker and migrations; explicit pool ceilings per process |
| Dashboard summary recomputed per request | Cache per store for 60s. It is a summary, not a bank statement |
| Report queries scanning all orders | Always bounded by `store_id` + date range; the composite index covers it |

### At 10× (thousands of orders/day)

| Concern | Approach |
|---|---|
| `balance_transactions` growth | Monthly range partitioning by `created_at`. Reconciliation queries are date-bounded, so partition pruning is effective |
| `webhook_events` growth | Same, plus archive-and-prune beyond 90 days (raw payloads are large and rarely read after reconciliation) |
| `outbox_events` growth | Delete published rows after 7 days. An unbounded outbox slowly poisons the relay's index |
| Reporting competing with transactions | Move reports to a Supabase read replica |
| Release scheduler scanning | Already partial-indexed; add batch limits with cursor continuation |
| Ledger sum for reconciliation | Materialized daily balance snapshot per store, so verification reads one row per day instead of summing all history |

### The two queries to watch

1. **Release scheduler** — `WHERE status = 'holding' AND holding_until <= now()`, every few minutes,
   forever. Partial index; batch-limited; must never table-scan.
2. **Outbox relay** — `WHERE status = 'pending' AND available_at <= now() ORDER BY available_at LIMIT n`,
   every few seconds, forever. Partial index; published rows pruned aggressively.

These two run more often than anything else in the system combined. If either degrades, everything
downstream of it stalls silently — which is exactly the failure mode that is hardest to notice.

### Backups

Supabase PITR on production. A `pg_dump` to object storage nightly as a second copy, because a backup
that lives only inside the provider you are backing up against is not really a backup. Restore drill
before launch and quarterly after — an untested backup is a hypothesis.

---

Next: [07 — Authentication & Authorization](./07-auth.md)
