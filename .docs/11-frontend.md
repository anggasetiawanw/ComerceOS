# 11 — Frontend Architecture

Next.js App Router, TypeScript, TailwindCSS, shadcn/ui, TanStack Query, React Hook Form + Zod, Zustand
for client state only.

---

## 1. Folder structure

```
web/
├── src/
│   ├── app/                          Routing only — thin, delegates to features
│   │   ├── (marketing)/              Public marketing shell
│   │   │   ├── page.tsx              Landing
│   │   │   ├── pricing/
│   │   │   ├── terms/ · privacy/
│   │   │   └── layout.tsx
│   │   ├── (storefront)/             Public seller pages
│   │   │   ├── [username]/
│   │   │   │   ├── page.tsx          /@username
│   │   │   │   ├── produk/[slug]/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   └── layout.tsx
│   │   ├── (checkout)/
│   │   │   └── checkout/
│   │   │       ├── [orderNumber]/page.tsx
│   │   │       └── [orderNumber]/status/page.tsx
│   │   ├── (buyer)/
│   │   │   └── akun/
│   │   │       ├── page.tsx          Purchase history
│   │   │       ├── pesanan/[id]/page.tsx
│   │   │       ├── unduhan/page.tsx
│   │   │       └── profil/page.tsx
│   │   ├── (dashboard)/
│   │   │   └── dashboard/
│   │   │       ├── page.tsx          Overview
│   │   │       ├── produk/ · pesanan/ · pembeli/ · promosi/
│   │   │       ├── keuangan/ · laporan/ · toko/ · pengaturan/
│   │   │       └── layout.tsx        Sidebar shell
│   │   ├── (admin)/
│   │   │   └── admin/
│   │   │       ├── page.tsx · penarikan/ · sengketa/
│   │   │       ├── rekonsiliasi/ · toko/ · audit/
│   │   │       └── layout.tsx
│   │   ├── (auth)/
│   │   │   ├── masuk/ · daftar/ · lupa-password/ · reset-password/
│   │   │   ├── callback/ · lengkapi-profil/
│   │   ├── api/                      Route handlers: OAuth cookie exchange, OG images
│   │   ├── layout.tsx                Root: providers, fonts, theme
│   │   ├── error.tsx · not-found.tsx
│   │   └── globals.css
│   │
│   ├── features/                     Feature-first. Most code lives here
│   │   ├── auth/
│   │   ├── store/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── checkout/
│   │   ├── buyers/
│   │   ├── promotions/
│   │   ├── finance/                  Balance, withdrawals, ledger
│   │   ├── reports/
│   │   ├── invoices/
│   │   ├── deliveries/
│   │   ├── storefront/
│   │   ├── admin/
│   │   └── billing/
│   │
│   ├── components/
│   │   ├── ui/                       shadcn primitives — generated, rarely edited
│   │   ├── layout/                   Shells, sidebar, navbar, footer
│   │   ├── data/                     DataTable, Pagination, EmptyState, ErrorState
│   │   ├── feedback/                 Loading, Skeleton, Toast, ConfirmDialog
│   │   ├── forms/                    FormField, MoneyInput, ImageUpload, FileUpload
│   │   └── charts/                   Recharts wrappers with the shared theme
│   │
│   ├── hooks/                        Cross-feature: useDebounce, useMediaQuery, useClipboard
│   ├── lib/
│   │   ├── api/                      Typed fetch client, interceptors, error mapping
│   │   ├── auth/                     Token store, refresh, server-side session
│   │   ├── utils/                    cn, formatRupiah, formatDate, slugify
│   │   ├── validation/               Shared Zod schemas
│   │   └── constants/                Routes, statuses, labels
│   ├── stores/                       Zustand — UI state only
│   ├── types/                        Shared types; API types from packages/contracts
│   └── config/                       Site config, nav definitions, feature flags
│
├── public/
├── components.json                   shadcn config
├── tailwind.config.ts
└── next.config.ts
```

### Feature folder shape

Every folder in `features/` follows the same internal structure:

```
features/orders/
├── components/          OrderTable, OrderStatusBadge, OrderTimeline, ReleaseDialog
├── hooks/               useOrders, useOrderDetail, useReleaseOrder
├── api/                 orders.api.ts — typed calls; orders.keys.ts — query keys
├── schemas/             Zod schemas shared by form and API validation
├── types/               Feature-local types
└── utils/               Status label maps, formatting
```

**Why feature-first.** Working on orders means touching a table, a detail view, three mutations, and a
status badge. Grouped by feature, that is one directory. Grouped by type, it is four directories and a
constant hunt for what belongs together. Cross-feature reuse is the exception, and when it appears it
gets promoted to `components/` or `hooks/` deliberately.

### Server Components by default

`app/` files are Server Components unless they need interactivity. `'use client'` is pushed to the
**leaf** — a page that is 90% static with one interactive dialog should ship one client component, not a
client page tree.

| Rendering | Used for | Why |
|---|---|---|
| Static / ISR | Landing, pricing, terms | No per-request data |
| Server Component + fetch | Storefront, product pages, dashboard lists | SEO, fast first paint, no client-side waterfall |
| Client Component | Forms, dialogs, tables with client sort, checkout | Needs state and handlers |
| Client + TanStack Query | Anything polling or optimistically updating | Payment status, dashboard live counts |

**The storefront must be server-rendered.** It is the growth loop's landing surface
([00 §1](./00-product-analysis.md#1-business-goals)) — a client-rendered product page that TikTok's
in-app browser renders slowly and Google indexes poorly directly damages the acquisition channel.
[AD-11](./README.md#decision-log).

### State management boundaries

| State | Tool | Examples |
|---|---|---|
| Server data | TanStack Query | Orders, products, buyers, balance |
| Server data (SSR) | Server Components | Storefront, initial dashboard payloads |
| Form state | React Hook Form + Zod | Every form |
| Global UI state | Zustand | Sidebar collapse, theme, auth token in memory |
| URL state | `useSearchParams` | Filters, pagination, tabs — shareable and back-button correct |
| Local state | `useState` | Dialog open, hover |

**Zustand holds no server data.** That is the single rule that prevents the classic mess where the same
order lives in a store, a query cache, and a prop, disagreeing with itself. Filters live in the URL, not
in a store — a seller sharing a filtered order list should be able to paste a link.

---

## 2. Page inventory

### Public / marketing

| Route | Page | Rendering | P |
|---|---|---|---|
| `/` | Landing — positioning, features, CTA | Static | P0 |
| `/harga` | Pricing: Free vs Pro | Static | P1 |
| `/syarat` · `/privasi` | Terms · Privacy | Static | P0 |
| `/panduan` | Seller onboarding guide | Static | P2 |

Terms and Privacy are P0, not paperwork. The product holds buyer phone numbers across many sellers
(`summary.md` §7 raises this explicitly) and holds seller funds — both need a stated policy before the
first real transaction.

### Storefront (public)

| Route | Page | Rendering | P |
|---|---|---|---|
| `/@[username]` | Store profile, social links, product grid | SSR + cache | P0 |
| `/@[username]/produk/[slug]` | Product detail, Beli + Tanya buttons, promo preview | SSR + cache | P0 |
| `/@[username]?promo=CODE` | Auto-applied promo variant | SSR | P1 |

### Checkout

| Route | Page | Rendering | P |
|---|---|---|---|
| `/checkout/[orderNumber]` | Summary, buyer details, Snap trigger | Client | P0 |
| `/checkout/[orderNumber]/status` | Post-payment result, polls until settled | Client | P0 |

### Auth

| Route | Page | P |
|---|---|---|
| `/masuk` | Password login form + Google sign-in | P0 |
| `/daftar` | Email/password registration | P0 |
| `/lupa-password` | Request a password reset email | P0 |
| `/reset-password` | Consume the reset token, set a new password | P0 |
| `/callback` | OAuth landing, token exchange, redirect | P0 |
| `/lengkapi-profil` | Name + phone completion | P0 |

### Buyer (`/akun`)

| Route | Page | P |
|---|---|---|
| `/akun` | Cross-seller order history | P0 |
| `/akun/pesanan/[id]` | Order detail, invoice, download, report a problem | P0 |
| `/akun/unduhan` | All purchased digital files | P0 |
| `/akun/profil` | Profile settings | P1 |

### Seller dashboard

| Route | Page | P |
|---|---|---|
| `/dashboard` | Overview: revenue cards, recent orders, pending release, quick actions | P0 |
| `/dashboard/produk` | Product list with filters | P0 |
| `/dashboard/produk/baru` · `/[id]` | Create · edit product | P0 |
| `/dashboard/pesanan` | Order list — status, source, date filters | P0 |
| `/dashboard/pesanan/[id]` | Order detail: items, buyer, timeline, actions | P0 |
| `/dashboard/pesanan/manual` | Create manual order (Path B) | P1 |
| `/dashboard/pesanan/pertanyaan` | Inquiry follow-up list | P1 |
| `/dashboard/pembeli` | Buyer database — search, sort, export | P0 |
| `/dashboard/pembeli/[id]` | Buyer detail: history, notes, tags | P1 |
| `/dashboard/promosi` | Promotion list | P1 |
| `/dashboard/promosi/baru` · `/[id]` | Create · edit, with share-link generator | P1 |
| `/dashboard/keuangan` | Balance, holding schedule, ledger | P0 |
| `/dashboard/keuangan/penarikan` | Withdrawal history + request | P0 |
| `/dashboard/keuangan/rekening` | Bank accounts | P0 |
| `/dashboard/laporan` | Revenue + gross profit reports | P1 |
| `/dashboard/laporan/produk` | Per-product performance | P1 |
| `/dashboard/invoice` | Invoice list | P0 |
| `/dashboard/toko` | Storefront editor: profile, social links, theme | P0 |
| `/dashboard/pengaturan` | Settlement mode, notifications, plan | P0 |
| `/dashboard/pengaturan/langganan` | Subscription management | P2 |

### Admin

| Route | Page | P |
|---|---|---|
| `/admin` | Platform metrics: GMV, take rate, **seller liability** | P1 |
| `/admin/penarikan` | Withdrawal queue — approve, reject, mark paid | P0 |
| `/admin/sengketa` | Dispute queue | P1 |
| `/admin/rekonsiliasi` | Daily reconciliation results and mismatches | P1 |
| `/admin/toko` · `/admin/toko/[id]` | Store lookup · detail | P1 |
| `/admin/pengguna` | User lookup | P1 |
| `/admin/audit` | Audit log viewer | P1 |
| `/admin/webhook` | Raw webhook inspection + reprocess | P1 |

### Route naming

Routes are in Indonesian; code identifiers are in English. Sellers and buyers read URLs — `/dashboard/pembeli`
communicates more to the target user than `/dashboard/buyers`, and the storefront URL is a shared,
public-facing artifact. Mixed-language routes would be worse than either choice made consistently.

---

## 3. Component inventory

### shadcn/ui primitives to install

| Component | Used for |
|---|---|
| `button` | Everywhere |
| `input` · `textarea` · `label` | Forms |
| `select` · `checkbox` · `radio-group` · `switch` | Filters, settings, settlement mode |
| `form` | React Hook Form integration |
| `dialog` · `alert-dialog` | Modals; destructive confirmations |
| `sheet` | Mobile nav, filter drawer |
| `dropdown-menu` | Row actions, user menu |
| `table` | Orders, buyers, products, ledger |
| `card` | Stat cards, product cards |
| `badge` | Order status, product type, plan |
| `tabs` | Order detail sections, report periods |
| `toast` (sonner) | Mutation feedback |
| `skeleton` | Loading states |
| `avatar` | Store and buyer avatars |
| `separator` · `scroll-area` · `tooltip` · `popover` | Layout and affordances |
| `calendar` · `date-picker` | Report ranges, promo validity |
| `command` | Product/buyer search |
| `progress` | Uploads |
| `accordion` | FAQ, mobile order detail |
| `alert` | Inline warnings (below-HPP, holding explanation) |

### Composite components

**Data display**

| Component | Notes |
|---|---|
| `DataTable` | TanStack Table wrapper: sorting, cursor pagination, row selection, responsive card fallback on mobile |
| `StatCard` | Label, value, delta, trend sparkline |
| `EmptyState` | Icon, message, primary action. One per list — an empty buyer list is a seller's *first* experience |
| `ErrorState` | Message + retry |
| `Timeline` | Order status history with actor and timestamp |
| `MoneyDisplay` | Formats `bigint` rupiah strings — the only place money is rendered |
| `DateDisplay` | Relative + absolute with tooltip, WIB |
| `CopyableText` | Storefront URLs, promo links, order numbers |

**Domain-specific**

| Component | Notes |
|---|---|
| `OrderStatusBadge` | Colour + label per state, consistent everywhere |
| `ProductTypeBadge` | digital / physical / service |
| `HoldingCountdown` | Time until release, with the reason ("T+3 setelah settlement Midtrans") |
| `BalanceCard` | Holding vs available, with the distinction explained inline |
| `WithdrawalStatusBadge` | |
| `PlanBadge` | Free / Pro |
| `ProductCard` | Storefront grid item |
| `StorefrontHeader` | Avatar, banner, bio, social links |
| `BuyWhatsAppButtons` | The Path A / Path B pair — always side by side, never one replacing the other |
| `PromoLinkGenerator` | Builds and copies `?promo=` share links |
| `InvoicePreview` | Shared HTML template — same markup renders on screen and into the PDF |
| `MarginWarning` | Below-HPP advisory. Advisory only, never blocking (`user-behavior.md` §12) |

**Forms**

| Component | Notes |
|---|---|
| `MoneyInput` | Rupiah formatting, integer-only, emits a string |
| `ImageUploader` | Drag-drop, preview, reorder, progress |
| `FileUploader` | Digital products; private bucket |
| `UsernameInput` | Debounced availability check with inline feedback |
| `PhoneInput` | Indonesian normalization `08xx ⇄ +628xx` |
| `ProductSelect` | Searchable, for manual orders and promo scope |
| `DateRangePicker` | Reports |
| `TagInput` | Buyer tags |

**Charts** (Recharts, shared theme)

`RevenueLineChart`, `ProfitBarChart`, `ProductPerformanceChart`, `OrderStatusPieChart`, `Sparkline`.

### Loading and empty states

Every list has three states, and all three are built at the same time as the list — retrofitting them
produces the "blank screen that looks broken" that a new seller sees on day one:

1. **Loading** — skeleton matching the final layout, never a spinner on a full page
2. **Empty** — explanation plus the action that fills it ("Belum ada pembeli. Bagikan link toko kamu untuk mulai.")
3. **Error** — what failed plus retry

### Design system

| Aspect | Approach |
|---|---|
| Theming | CSS variables via shadcn; light and dark from day one |
| Dark mode | `next-themes`, system default, no flash (script in `<head>`) |
| Typography | One sans family, Latin subset only |
| Spacing | Tailwind scale, no arbitrary values outside components |
| Colours | Semantic tokens (`--primary`, `--destructive`), never raw hex in components |
| Status colours | Fixed per order state and reused everywhere |
| Icons | `lucide-react` |
| Breakpoints | Mobile-first — the majority of Indonesian sellers manage their store on a phone |
| Motion | Minimal; respects `prefers-reduced-motion` |

**Mobile-first is a requirement, not a preference.** The seller checking whether an order came in is on a
phone, in a WhatsApp conversation, one-handed. A dashboard designed at 1440px and shrunk fails that user.
Data tables collapse to card lists below `md`, and primary actions stay reachable within thumb range.

---

## 4. Data fetching

### Server Components

```
async function StorefrontPage({ params }) {
  const store = await api.storefront.getByUsername(params.username);  // typed, cached
  return <Storefront store={store} />;
}
```

Server-side fetches use `next: { revalidate }` for public data and `cache: 'no-store'` for
authenticated data.

### Client mutations

TanStack Query with query keys per feature (`features/*/api/*.keys.ts`), optimistic updates only where
the operation cannot fail server-side, and invalidation by key prefix after mutation.

**No optimistic updates on money operations.** A withdrawal request that optimistically shows a reduced
balance and then fails leaves the seller believing money vanished. Money mutations wait for the server.

### Error handling

| Layer | Handling |
|---|---|
| Network | Retry twice with backoff, then `ErrorState` |
| `401` | Silent refresh, replay once, then redirect to `/masuk` |
| `403` | "Tidak punya akses" page |
| `422` (domain error) | Inline form error mapped from the RFC 7807 `type` |
| `429` | Toast with retry-after |
| `5xx` | `ErrorState` + Sentry report |

Domain errors from the API map to field-level form errors by `type`, so "saldo tidak cukup" appears next
to the amount field rather than as a disconnected toast.

---

## 5. Performance

| Concern | Approach |
|---|---|
| Storefront LCP | SSR + ISR, `next/image` with explicit dimensions, no client JS above the fold |
| Bundle size | Route-level code splitting; Snap SDK loaded only on checkout; charts dynamically imported |
| Dashboard tables | Server-side pagination, cursor-based; never fetch-all-and-filter |
| Images | Supabase Storage + `next/image`, WebP, responsive `sizes` |
| Fonts | `next/font`, self-hosted, Latin subset, `display: swap` |
| Third-party | Only Midtrans Snap, and only on the checkout route |

**Targets:** storefront LCP < 2.5s on 4G, dashboard TTI < 3s, Lighthouse ≥ 90 on public pages. The
storefront numbers matter commercially — it is the page a stranger loads from a TikTok bio, on a mid-range
Android phone, on mobile data.

---

Next: [12 — Roadmap & Sprints](./12-roadmap-sprints.md)
