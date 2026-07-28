# 10 — Background Jobs

All asynchronous work runs on BullMQ in `apps/worker`, a separate process from the API
([02 §6](./02-architecture.md#6-runtime-topology)).

---

## 1. Queue topology

Queues are separated by **failure impact and latency requirement**, not by feature. A slow PDF render
must never delay a payment webhook; a WhatsApp provider outage must never block invoice generation.

| Queue | Concurrency | Priority | Rationale |
|---|---|---|---|
| `payment` | 5 | Critical | Money correctness. Never blocked by anything |
| `order` | 3 | Critical | State transitions and releases |
| `ledger` | 1 | Critical | Serialized deliberately — ordering matters more than throughput |
| `outbox` | 2 | Critical | The relay; must never starve |
| `invoice` | 2 | High | Memory-heavy (PDF); isolated so it cannot exhaust the process |
| `delivery` | 5 | High | Buyer-facing, fast |
| `notification` | 10 | Normal | High volume, external latency, individually unimportant |
| `crm` | 3 | Normal | Data enrichment |
| `reconciliation` | 1 | Normal | Long-running, scheduled, singleton |
| `maintenance` | 1 | Low | Cleanup, off-peak |

`ledger` at concurrency 1 is a deliberate throughput sacrifice. Ledger jobs are short, and serializing
them removes an entire category of concurrency reasoning from the part of the system where mistakes are
most expensive. Revisit only when it demonstrably becomes a bottleneck.

---

## 2. Job catalogue

### `payment`

| Job | Trigger | What it does | Retries |
|---|---|---|---|
| `process-webhook` | Enqueued by the webhook controller | Dedup check, map status, dispatch the order command, mark processed | 5, exp 1s→16s |
| `poll-payment-status` | Scheduled every 15 min | For orders `pending_payment` older than 30 min with no webhook, query Midtrans Core API | 10, fixed 5 min |
| `retry-failed-webhook` | Scheduled hourly | Re-enqueue `webhook_events` stuck in `failed` under the attempt cap | 3 |
| `issue-refund` | `RefundOrder` command | Call the Midtrans refund API, update `refunds` | 3, exp 1m→4m |
| `fetch-settlement-report` | Daily 01:30 WIB | Pull D-1 settlement report into `settlement_reports` | 3 |

### `order`

| Job | Trigger | What it does | Retries |
|---|---|---|---|
| `expire-orders` | Every 10 min | `pending_payment` past its window → `expired`, restore stock | 3 |
| `release-holding-balance` | Every 15 min | `holding` where `holding_until <= now()`, settlement mode `auto`, not disputed → `released` | 3 |
| `auto-force-release` | Daily 03:00 WIB | Manual-mode orders 30+ days past `paid_at` → released, flagged | 3 |
| `recompute-holding-until` | On `OrderShipped` | Recompute `holding_until` from `shipped_at` for physical orders | 3 |
| `notify-expiring-orders` | Every 6 h | Reminder for orders expiring within 6 hours | 2 |

**`release-holding-balance` is the most important recurring job in the system.** It moves money. It is
batch-limited (500 orders/run, cursor-continued), skips disputed orders, re-checks the platform floor per
order rather than trusting the query, and is idempotent — a re-run finds nothing to do because the state
already advanced.

### `ledger`

| Job | Trigger | What it does | Retries |
|---|---|---|---|
| `credit-holding-balance` | `OrderPaid` via outbox | Ledger entry + balance cache update | 5 |
| `release-to-available` | `OrderReleased` via outbox | Holding → available | 5 |
| `debit-for-refund` | `OrderRefunded` via outbox | Debit, or flag manual recovery if already withdrawn | 5 |
| `verify-store-balances` | Weekly, Sunday 04:00 WIB | Recompute every store's balance from the ledger; raise `BalanceDriftDetected` on mismatch | 1 |
| `snapshot-daily-balances` | Daily 23:55 WIB | Per-store daily balance snapshot for faster future verification | 3 |

### `outbox`

| Job | Trigger | What it does | Retries |
|---|---|---|---|
| `relay-outbox-events` | Every 2 s (repeatable) | `SELECT pending FOR UPDATE SKIP LOCKED LIMIT 50`, publish, mark published | Unlimited, exp capped 5 min |
| `prune-published-events` | Daily 04:00 WIB | Delete `published` rows older than 7 days | 1 |

Pruning is not housekeeping — an unbounded outbox table slowly degrades the relay's index, which is the
hottest small query in the system ([06 §6](./06-database-roadmap.md#6-performance)).

### `invoice`

| Job | Trigger | What it does | Retries |
|---|---|---|---|
| `generate-invoice` | `OrderPaid` via outbox | Allocate number (if absent), render HTML → PDF, upload, create `invoices` | 3, exp 10s→40s |
| `deliver-invoice` | `InvoiceGenerated` | Dispatch to notification queue: email always, WA if a phone exists | 3 |
| `regenerate-invoice-pdf` | Admin action | Re-render to the same path, same number | 2 |

**Idempotent on `order_id`.** A retry finds the existing invoice, re-renders to the same storage path,
and does not consume a second number. Gaps in a numbered financial document are very hard to explain
after the fact.

### `delivery`

| Job | Trigger | What it does | Retries |
|---|---|---|---|
| `provision-digital-delivery` | `OrderPaid` via outbox | Create `digital_deliveries` per digital line item | 3 |
| `notify-delivery-ready` | `DeliveryProvisioned` | Notify the buyer with the `/akun` link | 3 |
| `cleanup-expired-deliveries` | Daily 04:30 WIB | Mark entitlements exhausted or expired | 1 |

### `notification`

| Job | Trigger | What it does | Retries |
|---|---|---|---|
| `send-email` | Any notification event | Render template, send via provider, log delivery | 5, exp 30s→8m |
| `send-whatsapp` | Any notification event with a phone | Render, send via Fonnte/Wablas, log | 3, exp 1m→4m |
| `retry-failed-notifications` | Hourly | Re-enqueue failures under the attempt cap | 1 |

Email and WhatsApp are **separate jobs, not a single job with two steps.** A WA provider outage must not
prevent the email from arriving, and a failing WA job must not retry the email five times.

### `crm`

| Job | Trigger | What it does | Retries |
|---|---|---|---|
| `upsert-store-buyer` | `OrderPaid` via outbox | Upsert `store_buyers`; **recompute** totals from orders rather than incrementing | 5 |
| `decrement-store-buyer` | `OrderRefunded` | Recompute after refund | 5 |
| `refresh-buyer-segments` | Daily 05:00 WIB | Recompute derived segments (P2) | 1 |

Recomputation rather than incrementing is what makes the job safe to replay. An incrementing upsert
double-counts on redelivery, and the resulting inflated lifetime-spend figure is immediately visible to
the seller — undermining the exact numbers the product's credibility rests on.

### `reconciliation`

| Job | Trigger | What it does | Retries |
|---|---|---|---|
| `run-daily-reconciliation` | Daily 02:00 WIB | Three-way match: settlement report ↔ webhook events ↔ orders. Persist `reconciliation_runs` | 2 |
| `alert-reconciliation-mismatches` | After each run | Notify admin if `mismatch_count > 0` | 3 |

### `maintenance`

| Job | Trigger | What it does | Retries |
|---|---|---|---|
| `prune-webhook-events` | Weekly | Archive payloads older than 90 days | 1 |
| `prune-idempotency-keys` | Daily | Delete keys past `expires_at` | 1 |
| `prune-refresh-tokens` | Daily | Delete expired/revoked tokens older than 30 days | 1 |
| `warm-storefront-cache` | Every 30 min | Pre-cache the top storefronts by traffic | 1 |
| `cleanup-orphan-uploads` | Weekly | Remove storage objects with no database reference | 1 |

---

## 3. Notifications

Every user-facing message, its trigger, and its channel.

| Template | Trigger | To | Email | WA |
|---|---|---|---|---|
| `order_created_buyer` | `OrderCreated` | Buyer | ✅ | ✅ |
| `order_paid_buyer` | `OrderPaid` | Buyer | ✅ | ✅ |
| `order_paid_seller` | `OrderPaid` | Seller | ✅ | ✅ |
| `invoice_ready` | `InvoiceGenerated` | Buyer | ✅ (attached) | ✅ (link) |
| `digital_delivery_ready` | `DeliveryProvisioned` | Buyer | ✅ | ✅ |
| `order_expiring_soon` | 6 h before expiry | Buyer | ✅ | ✅ |
| `order_expired` | `OrderExpired` | Buyer | ✅ | — |
| `order_shipped` | `OrderShipped` | Buyer | ✅ | ✅ |
| `order_released` | `OrderReleased` | Seller | ✅ | — |
| `order_disputed` | `OrderDisputed` | Seller + admin | ✅ | ✅ |
| `order_refunded` | `OrderRefunded` | Buyer + seller | ✅ | ✅ |
| `withdrawal_requested` | `WithdrawalRequested` | Admin | ✅ | — |
| `withdrawal_paid` | `WithdrawalPaid` | Seller | ✅ | ✅ |
| `withdrawal_rejected` | `WithdrawalRejected` | Seller | ✅ | ✅ |
| `inquiry_received` | `InquiryCreated` | Seller | ✅ | ✅ |
| `balance_drift_detected` | `BalanceDriftDetected` | Admin | ✅ | — |
| `reconciliation_mismatch` | `ReconciliationMismatchDetected` | Admin | ✅ | — |
| `subscription_past_due` | `SubscriptionPastDue` | Seller | ✅ | — |

### Channel port

```
interface NotificationChannel {
  readonly type: 'email' | 'whatsapp';
  send(recipient: Recipient, message: RenderedMessage): Promise<DeliveryResult>;
  supports(recipient: Recipient): boolean;
}
```

`NotificationDispatcher` selects channels by template configuration and recipient capability, calls each,
and records the outcome in `notification_deliveries`.

**Email is guaranteed; WhatsApp is best-effort.** Fonnte and Wablas operate in a ToS grey area
(`summary.md` §7) and can be terminated without notice. No user-visible promise may depend solely on WA
delivery — invoices always go by email, and WA is an addition, not a substitute
([AD-10](./README.md#decision-log)).

Switching to the official WhatsApp Business API later is a new `NotificationChannel` implementation plus
a config change. Nothing else in the system knows which provider is wired.

---

## 4. Scheduling

| Job | Schedule (WIB) |
|---|---|
| `relay-outbox-events` | every 2 s |
| `expire-orders` | every 10 min |
| `release-holding-balance` | every 15 min |
| `poll-payment-status` | every 15 min |
| `warm-storefront-cache` | every 30 min |
| `retry-failed-webhook` | hourly |
| `retry-failed-notifications` | hourly |
| `notify-expiring-orders` | every 6 h |
| `fetch-settlement-report` | daily 01:30 |
| `run-daily-reconciliation` | daily 02:00 |
| `auto-force-release` | daily 03:00 |
| `prune-published-events` | daily 04:00 |
| `cleanup-expired-deliveries` | daily 04:30 |
| `refresh-buyer-segments` | daily 05:00 |
| `snapshot-daily-balances` | daily 23:55 |
| `prune-idempotency-keys` | daily 04:15 |
| `prune-refresh-tokens` | daily 04:20 |
| `verify-store-balances` | weekly Sun 04:00 |
| `prune-webhook-events` | weekly Sun 05:00 |
| `cleanup-orphan-uploads` | weekly Sun 05:30 |

All schedules are WIB (UTC+7), configured explicitly. Times are staggered so the daily batch does not
contend for the same connections. Repeatable jobs use fixed job IDs so a redeploy does not accumulate
duplicate schedulers — a classic BullMQ trap that silently doubles every scheduled job on each deploy.

---

## 5. Operational rules

### Idempotency

Every job must be safe to run twice. BullMQ guarantees at-least-once. The patterns used:

| Pattern | Used by |
|---|---|
| Natural unique key | `generate-invoice` (order_id), `provision-digital-delivery` (order_item_id) |
| State guard | All order transition jobs — an illegal transition means it already ran |
| Recompute, never increment | `upsert-store-buyer` |
| Dedup lookup | `process-webhook` |

### Failure and dead lettering

Jobs that exhaust retries move to a dead-letter queue. Money-related DLQ entries (`payment`, `order`,
`ledger`, `outbox`, `invoice`) raise an **immediate admin alert**. Others are reviewed daily.

A silently discarded money job is worse than a loud failure — it produces a system that looks healthy
while being wrong.

### Observability

Every job logs `jobId`, `queue`, `attempt`, duration, and outcome with a correlation ID propagated from
the originating request. Metrics: queue depth, processing rate, failure rate, DLQ size, oldest pending
outbox row.

**Alert thresholds:**

| Condition | Severity |
|---|---|
| Oldest pending outbox row > 60 s | Critical — the event pipeline has stalled |
| `payment` or `ledger` DLQ non-empty | Critical |
| `release-holding-balance` failed twice consecutively | Critical — sellers are not getting paid |
| Reconciliation mismatches > 0 | High |
| Balance drift detected | Critical |
| `notification` queue depth > 1000 | Warning |
| Any queue paused | Critical |

### Graceful shutdown

On `SIGTERM` the worker stops accepting new jobs, waits up to 30 s for in-flight jobs to finish, then
exits. Jobs still running are returned to the queue by BullMQ's stalled-job detection. Deploys therefore
never lose work — but every job must still be idempotent, because a job killed *after* its database
commit but *before* its acknowledgement will be redelivered.

---

Next: [11 — Frontend Architecture](./11-frontend.md)
