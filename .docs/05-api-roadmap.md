# 05 — API Roadmap

Base path `/api/v1`. All responses are enveloped as `{ data, meta? }`; errors follow RFC 7807.

**Auth column legend**

| Value | Meaning |
|---|---|
| — | Public, no token |
| `U` | Any authenticated user |
| `S` | Authenticated **and** owner of the target store |
| `B` | Authenticated **and** buyer on the target order |
| `A` | Admin role |
| `SIG` | Signature-verified webhook, no JWT |

Priority column matches [01 §2](./01-feature-breakdown.md#2-prioritization).

---

## 1. Authentication — `/auth`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/auth/google` | — | Redirect to Google consent screen; carries `state` + optional `redirect_uri` | P0 |
| `GET` | `/auth/google/callback` | — | Exchange authorization code, provision user, issue token pair | P0 |
| `POST` | `/auth/google/token` | — | Exchange a Google ID token directly (used by the web SDK flow) | P0 |
| `POST` | `/auth/refresh` | — | Rotate refresh token, issue new access token | P0 |
| `POST` | `/auth/logout` | `U` | Revoke the presented refresh token | P0 |
| `POST` | `/auth/logout-all` | `U` | Revoke every token family for the user | P2 |
| `GET` | `/auth/sessions` | `U` | List active refresh-token families | P2 |

## 2. Users — `/users`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/users/me` | `U` | Current user with roles and store summary | P0 |
| `PATCH` | `/users/me` | `U` | Update name, phone, avatar | P0 |
| `POST` | `/users/me/complete-profile` | `U` | Post-login profile completion (phone required for checkout) | P0 |
| `DELETE` | `/users/me` | `U` | Account deletion request | P2 |

---

## 3. Stores — `/stores`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `POST` | `/stores` | `U` | Create a store, claim a username | P0 |
| `GET` | `/stores/me` | `U` | The caller's store | P0 |
| `PATCH` | `/stores/me` | `S` | Update display name, bio, avatar, banner | P0 |
| `GET` | `/stores/username-available` | `U` | `?username=` availability check | P0 |
| `PATCH` | `/stores/me/username` | `S` | Change username (rate-limited) | P1 |
| `GET` | `/stores/me/settings` | `S` | Settlement mode, plan, preferences | P0 |
| `PATCH` | `/stores/me/settings/settlement` | `S` | Set `auto` / `manual` — floor enforced server-side | P0 |
| `PATCH` | `/stores/me/theme` | `S` | Storefront theme | P2 |
| `GET` | `/stores/me/social-links` | `S` | List | P1 |
| `POST` | `/stores/me/social-links` | `S` | Add | P1 |
| `PATCH` | `/stores/me/social-links/:id` | `S` | Update | P1 |
| `DELETE` | `/stores/me/social-links/:id` | `S` | Remove | P1 |
| `PUT` | `/stores/me/social-links/order` | `S` | Reorder | P1 |

## 4. Products — `/products`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/products` | `S` | List own products — filter by status/type, search, paginate | P0 |
| `POST` | `/products` | `S` | Create | P0 |
| `GET` | `/products/:id` | `S` | Detail | P0 |
| `PATCH` | `/products/:id` | `S` | Update | P0 |
| `POST` | `/products/:id/publish` | `S` | Draft → active (validates digital files present) | P0 |
| `POST` | `/products/:id/archive` | `S` | Archive — never hard-delete | P0 |
| `PATCH` | `/products/:id/stock` | `S` | Adjust stock | P1 |
| `POST` | `/products/:id/images` | `S` | Upload image (multipart → Supabase Storage) | P0 |
| `DELETE` | `/products/:id/images/:imageId` | `S` | Remove image | P0 |
| `GET` | `/products/:id/files` | `S` | List digital files | P0 |
| `POST` | `/products/:id/files` | `S` | Upload digital file to the private bucket | P0 |
| `DELETE` | `/products/:id/files/:fileId` | `S` | Remove digital file | P0 |

---

## 5. Storefront (public) — `/storefront`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/storefront/:username` | — | Store profile, social links, active products. Cached | P0 |
| `GET` | `/storefront/:username/products` | — | Paginated product list | P0 |
| `GET` | `/storefront/:username/products/:slug` | — | Product detail; `?promo=CODE` returns a discounted price preview | P0 |
| `POST` | `/storefront/:username/inquiries` | — | Record an inquiry, return the WA deep link | P1 |
| `POST` | `/storefront/:username/promotions/validate` | — | Validate a code against a prospective basket | P1 |

Public endpoints are rate-limited per IP and served from Redis cache with a short TTL, invalidated by
`ProductUpdated` / `StoreCreated` events.

---

## 6. Checkout & orders

### 6.1 Checkout — `/checkout`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `POST` | `/checkout/quote` | `U` | Price a prospective basket: subtotal, discount, fee, total. No persistence | P0 |
| `POST` | `/checkout` | `U` | Create order + Snap token. Requires `Idempotency-Key` | P0 |
| `GET` | `/checkout/:orderId/status` | `B` | Poll payment status (fallback when a webhook is late) | P1 |

### 6.2 Seller orders — `/orders`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/orders` | `S` | List — filter by status, source, date range, buyer; cursor paginated | P0 |
| `GET` | `/orders/:id` | `S` | Detail with items, buyer, invoice, ledger entries | P0 |
| `POST` | `/orders/manual` | `S` | Create a manual order (Path B) with price override | P1 |
| `POST` | `/orders/:id/confirm-payment` | `S` | Mark manually-received payment as paid | P1 |
| `POST` | `/orders/:id/ship` | `S` | Record courier + tracking; starts the physical holding clock | P1 |
| `POST` | `/orders/:id/release` | `S` | Manual release; rejected before the platform floor | P0 |
| `POST` | `/orders/:id/cancel` | `S` | Cancel an unpaid order | P0 |
| `POST` | `/orders/:id/refund` | `S` | Initiate a refund | P1 |
| `POST` | `/orders/:id/dispute` | `S` | Raise a dispute on the buyer's behalf (from a WA conversation) | P1 |
| `GET` | `/orders/:id/history` | `S` | Status transition history | P1 |
| `GET` | `/orders/pending-release` | `S` | Orders awaiting release — the manual-mode work queue | P0 |

### 6.3 Buyer orders — `/me/orders`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/me/orders` | `U` | Cross-seller purchase history (`/akun`) | P0 |
| `GET` | `/me/orders/:id` | `B` | Order detail with delivery and invoice links | P0 |
| `POST` | `/me/orders/:id/dispute` | `B` | "Laporkan masalah" | P1 |
| `GET` | `/me/orders/:id/invoice` | `B` | Invoice PDF URL | P0 |

### 6.4 Inquiries — `/inquiries`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/inquiries` | `S` | List — filter `open` / `converted` / `lost` | P1 |
| `GET` | `/inquiries/:id` | `S` | Detail | P1 |
| `POST` | `/inquiries/:id/convert` | `S` | Create a manual order from this inquiry | P1 |
| `POST` | `/inquiries/:id/mark-lost` | `S` | Close without conversion | P1 |

---

## 7. Payments — `/payments`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `POST` | `/payments/midtrans/webhook` | `SIG` | Midtrans notification receiver. Verifies signature, persists raw, enqueues, returns `200` fast | P0 |
| `POST` | `/payments/orders/:orderId/snap-token` | `B` | Re-issue a Snap token for an unpaid order | P0 |
| `GET` | `/payments/orders/:orderId` | `B` | Payment status for an order | P1 |

**Webhook contract.** Always `200` once the payload is persisted, even if processing later fails — the
raw row is the recovery mechanism. Non-`200` only for signature failure (`401`) or malformed body (`400`).
Returning `500` on a processing bug would trigger Midtrans retries against a bug that retrying cannot fix.

---

## 8. Invoices — `/invoices`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/invoices` | `S` | List store invoices | P0 |
| `GET` | `/invoices/:id` | `S` | Detail | P0 |
| `GET` | `/invoices/:id/pdf` | `S`/`B` | Signed PDF URL | P0 |
| `POST` | `/invoices/:id/resend` | `S` | Resend over email and/or WhatsApp | P1 |

## 9. Digital delivery — `/deliveries`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/me/deliveries` | `U` | Buyer's purchased files across all sellers | P0 |
| `POST` | `/me/deliveries/:id/download` | `B` | Issue a signed URL, increment the counter | P0 |
| `POST` | `/deliveries/:id/extend` | `A` | Support action: extend the allowance | P2 |

---

## 10. CRM — `/buyers`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/buyers` | `S` | Buyer list — search, sort by spend/orders/recency, cursor paginated | P0 |
| `GET` | `/buyers/:id` | `S` | Buyer detail with per-store order history | P1 |
| `PATCH` | `/buyers/:id/notes` | `S` | Private notes | P1 |
| `POST` | `/buyers/:id/tags` | `S` | Add tag | P1 |
| `DELETE` | `/buyers/:id/tags/:tag` | `S` | Remove tag | P1 |
| `GET` | `/buyers/export` | `S` | CSV export (Pro-gated) | P1 |
| `GET` | `/buyers/segments` | `S` | Derived segments | P2 |

## 11. Promotions — `/promotions`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/promotions` | `S` | List | P1 |
| `POST` | `/promotions` | `S` | Create — returns the auto-apply share link | P1 |
| `GET` | `/promotions/:id` | `S` | Detail with redemption stats | P1 |
| `PATCH` | `/promotions/:id` | `S` | Update | P1 |
| `POST` | `/promotions/:id/deactivate` | `S` | Deactivate | P1 |
| `GET` | `/promotions/:id/redemptions` | `S` | Redemption list | P2 |

---

## 12. Balance & withdrawals

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/balance` | `S` | Holding + available, with the next scheduled release | P0 |
| `GET` | `/balance/transactions` | `S` | Ledger history, cursor paginated | P1 |
| `GET` | `/bank-accounts` | `S` | List payout destinations | P0 |
| `POST` | `/bank-accounts` | `S` | Add | P0 |
| `PATCH` | `/bank-accounts/:id/default` | `S` | Set default | P0 |
| `DELETE` | `/bank-accounts/:id` | `S` | Remove | P1 |
| `GET` | `/withdrawals` | `S` | Withdrawal history | P0 |
| `POST` | `/withdrawals` | `S` | Request — validates balance and destination. Requires `Idempotency-Key` | P0 |
| `GET` | `/withdrawals/:id` | `S` | Detail | P0 |

## 13. Reports — `/reports`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/dashboard/summary` | `S` | Today / 7d / 30d cards: revenue, orders, buyers, pending release | P0 |
| `GET` | `/reports/revenue` | `S` | Revenue by period, grouped daily/weekly/monthly | P0 |
| `GET` | `/reports/profit` | `S` | Gross profit from HPP snapshots | P1 |
| `GET` | `/reports/products` | `S` | Per-product units, revenue, margin | P1 |
| `GET` | `/reports/buyers` | `S` | Acquisition and repeat-rate stats | P2 |
| `GET` | `/reports/export` | `S` | CSV export | P2 |

## 14. Billing — `/billing`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/billing/plans` | — | Public plan catalogue | P1 |
| `GET` | `/billing/subscription` | `S` | Current subscription | P1 |
| `POST` | `/billing/subscribe` | `S` | Start a Pro subscription | P2 |
| `POST` | `/billing/cancel` | `S` | Cancel at period end | P2 |
| `GET` | `/billing/invoices` | `S` | Subscription billing history | P2 |
| `POST` | `/billing/midtrans/webhook` | `SIG` | Recurring charge notifications | P2 |

---

## 15. Admin — `/admin`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/admin/withdrawals` | `A` | Queue, filtered by status | P0 |
| `POST` | `/admin/withdrawals/:id/approve` | `A` | Approve for transfer | P0 |
| `POST` | `/admin/withdrawals/:id/reject` | `A` | Reject with a reason; refunds the available balance | P0 |
| `POST` | `/admin/withdrawals/:id/mark-paid` | `A` | Confirm the transfer, finalize the ledger debit | P0 |
| `GET` | `/admin/disputes` | `A` | Open disputes | P1 |
| `POST` | `/admin/disputes/:orderId/resolve` | `A` | Resolve: release / refund | P1 |
| `GET` | `/admin/metrics` | `A` | GMV, take rate, **total seller liability**, active stores | P1 |
| `GET` | `/admin/reconciliation` | `A` | Daily run results | P1 |
| `POST` | `/admin/reconciliation/run` | `A` | Trigger reconciliation manually | P1 |
| `GET` | `/admin/stores` | `A` | Store lookup | P1 |
| `GET` | `/admin/stores/:id` | `A` | Store detail with balances and orders | P1 |
| `GET` | `/admin/users` | `A` | User lookup | P1 |
| `GET` | `/admin/audit-logs` | `A` | Filter by actor, entity, action, date | P1 |
| `GET` | `/admin/webhook-events` | `A` | Raw webhook inspection | P1 |
| `POST` | `/admin/webhook-events/:id/reprocess` | `A` | Replay a failed webhook | P1 |
| `POST` | `/admin/stores/:id/plan` | `A` | Override plan (support/comp) | P2 |

## 16. System — `/`

| Method | Path | Auth | Description | P |
|---|---|---|---|---|
| `GET` | `/health` | — | Liveness | P0 |
| `GET` | `/health/ready` | — | Readiness: Postgres, Redis, storage | P0 |
| `GET` | `/docs` | basic auth in prod | Swagger UI | P0 |
| `GET` | `/metrics` | internal | Prometheus metrics | P1 |

---

## 17. Conventions

### Idempotency

`POST /checkout` and `POST /withdrawals` require an `Idempotency-Key` header. The key plus a hash of the
request body is stored; a replay within 24h returns the original response rather than acting twice.
Everything else is either naturally idempotent or non-financial.

### Pagination

High-volume lists (orders, buyers, ledger, audit logs, webhook events) use cursor pagination:

```
GET /orders?limit=20&cursor=<opaque>
→ { data: [...], meta: { nextCursor, hasMore } }
```

Small lists (products, promotions, social links, bank accounts) use offset pagination. Cursors are
opaque base64 of `(created_at, id)` — stable under concurrent inserts, which offset is not.

### Errors

```json
{
  "type": "https://nagihin.id/errors/insufficient-balance",
  "title": "Insufficient available balance",
  "status": 422,
  "detail": "Requested 500000, available 320000",
  "errors": null
}
```

| Status | Used for |
|---|---|
| `400` | Malformed request |
| `401` | Missing/invalid token, bad webhook signature |
| `403` | Authenticated but not permitted (wrong store owner, wrong role) |
| `404` | Not found — also returned instead of `403` when leaking existence would matter |
| `409` | Conflict (username taken, duplicate idempotency key with a different body) |
| `422` | Domain rule violation (illegal transition, insufficient balance, promo exhausted) |
| `429` | Rate limited |

**`422` is the domain-error status.** Every `DomainError` maps to it by default, with `type` carrying the
specific rule. This keeps the distinction clear: `400` means "you sent nonsense", `422` means "your
request was well-formed but the business rules say no".

### Rate limits

| Scope | Limit |
|---|---|
| Public storefront | 120 req/min per IP |
| Auth endpoints | 10 req/min per IP |
| Authenticated general | 300 req/min per user |
| Checkout | 10 req/min per user |
| Webhook | unlimited (signature-gated) |
| Admin | 600 req/min per admin |

---

Next: [06 — Database Roadmap](./06-database-roadmap.md)
