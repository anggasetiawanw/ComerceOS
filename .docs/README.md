# Nagihin — Engineering Documentation

Engineering plan for **Nagihin**, a commerce operating system for small Indonesian sellers:
storefront + automatic invoicing + verified buyer database + mini accounting (HPP → gross profit).

These documents translate the product decisions in [`../user-behavior.md`](../user-behavior.md) and
[`../database-schema.md`](../database-schema.md) into an executable engineering contract. Those two
files remain the **source of truth for product requirements**; everything in `docs/` is the source of
truth for *how it gets built*.

---

## Reading order

If you are new to the project, read in this order. Each document assumes the ones above it.

| # | Document | Read it when you need to know… |
|---|---|---|
| 00 | [Product Analysis](./00-product-analysis.md) | Why this product exists, who uses it, what can kill it |
| 01 | [Feature Breakdown & Prioritization](./01-feature-breakdown.md) | What we build, in what order, and what we deliberately do not build |
| 02 | [Backend Architecture](./02-architecture.md) | Folder structure, layering rules, ORM decision |
| 03 | [Bounded Contexts](./03-bounded-contexts.md) | Which module owns which data and which rules |
| 04 | [Entity Design](./04-entity-design.md) | Aggregates, value objects, commands, queries, events per module |
| 05 | [API Roadmap](./05-api-roadmap.md) | The complete REST surface |
| 06 | [Database Roadmap](./06-database-roadmap.md) | Migration order, indexes, constraints, schema amendments |
| 07 | [Authentication & Authorization](./07-auth.md) | Google OAuth, JWT rotation, guards, RBAC matrix |
| 08 | [Order State Machine](./08-order-state-machine.md) | Every order state, transition, and invariant |
| 09 | [Payments & Ledger](./09-payments-ledger.md) | Midtrans, webhooks, idempotency, balances, withdrawals |
| 10 | [Background Jobs](./10-background-jobs.md) | Every BullMQ queue, schedule, retry policy |
| 11 | [Frontend Architecture](./11-frontend.md) | Next.js structure, page inventory, component inventory |
| 12 | [Roadmap & Sprints](./12-roadmap-sprints.md) | Milestones, sprint backlog, developer TODO lists |
| 13 | [DevOps, Testing & Production](./13-devops-testing-prod.md) | Git strategy, test strategy, launch checklist, future improvements |

---

## Section mapping

Traceability from the original 23-section request to where each answer lives.

| Requested section | Document |
|---|---|
| 1. Analyze the documents | [00](./00-product-analysis.md) |
| 2. Feature breakdown | [01 §1](./01-feature-breakdown.md#1-module-map) |
| 3. Prioritization (P0/P1/P2/Future) | [01 §2](./01-feature-breakdown.md#2-prioritization) |
| 4. Backend folder structure | [02 §3](./02-architecture.md#3-folder-structure) |
| 5. DDD bounded contexts | [03](./03-bounded-contexts.md) |
| 6. Entity design | [04](./04-entity-design.md) |
| 7. API roadmap | [05](./05-api-roadmap.md) |
| 8. Database roadmap | [06](./06-database-roadmap.md) |
| 9. Prisma vs TypeORM | [02 §5](./02-architecture.md#5-prisma-vs-typeorm) |
| 10. Authentication flow | [07](./07-auth.md) |
| 11. Order state machine | [08](./08-order-state-machine.md) |
| 12. Payment architecture | [09](./09-payments-ledger.md) |
| 13. Background jobs | [10](./10-background-jobs.md) |
| 14. Frontend architecture | [11 §1](./11-frontend.md#1-folder-structure) |
| 15. Frontend pages | [11 §2](./11-frontend.md#2-page-inventory) |
| 16. UI components | [11 §3](./11-frontend.md#3-component-inventory) |
| 17. Development roadmap | [12 §1](./12-roadmap-sprints.md#1-milestones) |
| 18. Sprint plan | [12 §2](./12-roadmap-sprints.md#2-sprint-backlog) |
| 19. Developer task list | [12 §3](./12-roadmap-sprints.md#3-developer-task-list) |
| 20. Git strategy | [13 §1](./13-devops-testing-prod.md#1-git-strategy) |
| 21. Testing strategy | [13 §2](./13-devops-testing-prod.md#2-testing-strategy) |
| 22. Production checklist | [13 §3](./13-devops-testing-prod.md#3-production-checklist) |
| 23. Nice-to-have improvements | [13 §4](./13-devops-testing-prod.md#4-nice-to-have-improvements) |

---

## Decision log

Architectural decisions taken in these documents. Each row links to the full justification.
Product decisions (holding periods, monetization, Model 1 payments) live in `../user-behavior.md`
and are treated here as given.

| ID | Decision | Rationale | Where |
|---|---|---|---|
| AD-01 | **Modular monolith**, not microservices | One part-time engineer. Module boundaries are enforced in code so extraction later is mechanical, not a rewrite | [02 §1](./02-architecture.md#1-architectural-style) |
| AD-02 | **Tiered architectural rigor** — full DDD/CQRS only in Ordering, Payments, Ledger | Ceremony where correctness is money; thin service+repository where it is CRUD. Same folder skeleton everywhere so any module can be upgraded | [02 §2](./02-architecture.md#2-tiered-rigor) |
| AD-03 | **Prisma** over TypeORM | Superior migrations and type-safety for a solo maintainer; DDD weakness neutralized by repository + mapper pattern | [02 §5](./02-architecture.md#5-prisma-vs-typeorm) |
| AD-04 | **Money as `BIGINT` rupiah integers**, not `numeric` | IDR has no practical minor unit; integers eliminate rounding drift in fee splits and ledger sums | [06 §2](./06-database-roadmap.md#2-schema-amendments) |
| AD-05 | **Transactional outbox** for domain events | Prevents "order marked paid but the ledger job was lost" when Redis is down | [09 §6](./09-payments-ledger.md#6-outbox--event-flow) |
| AD-06 | **Ledger is authoritative, balances are caches** | `balance_transactions` is append-only truth; `stores.*_balance` is a rebuildable read cache verified nightly | [09 §4](./09-payments-ledger.md#4-ledger-design) |
| AD-07 | **Idempotency on every money-touching write** | Midtrans retries webhooks; users double-click checkout. Keyed on `webhook_events` and `idempotency_keys` | [09 §3](./09-payments-ledger.md#3-idempotency) |
| AD-08 | **`inquiry` is not an order status** | It is a pre-order entity with its own lifecycle; folding it into the order enum would put moneyless rows in the money table | [08 §1](./08-order-state-machine.md#1-scope-inquiry-is-not-an-order) |
| AD-09 | **Holding period = max risk tier across order items** | A mixed digital+physical order must not release early on the digital item's rules | [08 §4](./08-order-state-machine.md#4-holding-period-rules) |
| AD-10 | **Notification channels behind a port** | WA provider choice (Fonnte/Wablas vs official WABA) is a ToS and cost bet that will change; the domain must not know which one is wired | [10 §3](./10-background-jobs.md#3-notifications) |
| AD-11 | **Server Components by default** on the frontend | Storefront SEO and first-paint are a growth lever; client state is the exception, not the default | [11 §1](./11-frontend.md#1-folder-structure) |
| AD-12 | **Trunk-based with short-lived branches**, not Git Flow | Git Flow's release/hotfix branches are overhead a solo developer pays for and never uses | [13 §1](./13-devops-testing-prod.md#1-git-strategy) |

---

## Scope reality

The full P0 set is **8–10 sprints (16–20 weeks)** at a part-time pace of ~20–25h per two-week sprint —
not the 1–2 months assumed in `../summary.md`. [Document 12](./12-roadmap-sprints.md) presents both the
honest full-P0 timeline and a **Thin MVP cut line at Sprint 5** that is genuinely shippable in ~8 weeks.

Read [12 §4](./12-roadmap-sprints.md#4-the-thin-mvp-cut-line) before committing to any launch date.
