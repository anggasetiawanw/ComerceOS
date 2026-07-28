# 04 — Entity Design

Per-context tactical design. Tier assignments come from [02 §2](./02-architecture.md#2-tiered-rigor);
Tier 3 contexts legitimately have empty domain sections.

Shared kernel value objects — available everywhere, defined once in `shared/kernel/value-objects/`:

| VO | Invariants |
|---|---|
| `Money` | `bigint` rupiah, non-negative unless explicitly signed, arithmetic returns `Money`, no float ever |
| `Email` | RFC-shaped, lowercased, trimmed |
| `Phone` | Indonesian normalization `08xx ⇄ +628xx`; stored canonical `+62` |
| `Username` | 3–30 chars, `[a-z0-9_.]`, no leading/trailing separator, not in the reserved blocklist |
| `Slug` | URL-safe, unique per store |
| `UniqueId` | UUIDv7, generated in application code |
| `DateRange` | `from ≤ until` |

---

## 1. Identity — Tier 2

| Element | Detail |
|---|---|
| **Aggregate** | `User` — root |
| **Entities** | `RefreshToken` (inside the `User` aggregate; a token cannot exist without its user) |
| **Value objects** | `Email`, `Phone`, `UserRole` (`buyer`/`seller`/`admin`), `GoogleId`, `TokenFamily` |
| **Repositories** | `UserRepository` — `findById`, `findByGoogleId`, `findByEmail`, `save`; `RefreshTokenRepository` — `findByHash`, `revokeFamily`, `save`, `pruneExpired` |
| **Domain services** | `TokenRotationService` — issues a new refresh token, revokes the predecessor, detects reuse of an already-rotated token and kills the whole family |
| **Factories** | `User.registerFromGoogle(profile)` — the only construction path; enforces that a user always has a verified email |
| **Domain events** | `UserRegistered`, `UserProfileCompleted`, `RefreshTokenReuseDetected` |
| **Application services** | `AuthService`, `UserProfileService` |
| **Commands** | `LoginWithGoogle`, `RefreshAccessToken`, `Logout`, `LogoutAllSessions`, `UpdateProfile`, `CompleteProfile` |
| **Queries** | `GetCurrentUser`, `ListActiveSessions` |
| **DTOs** | `GoogleCallbackDto`, `RefreshTokenDto`, `UpdateProfileDto`, `AuthTokensResponseDto`, `UserResponseDto` |
| **Controllers** | `AuthController` (`/auth/*`), `UsersController` (`/users/me`) |

**Design note.** `RefreshToken` sits inside the `User` aggregate rather than standing alone because
reuse detection is an invariant *across a user's tokens* — revoking a family requires knowing all of
them. Modelling tokens as an independent root would push that rule into a service and make the
revocation race hard to reason about.

---

## 2. Store — Tier 2

| Element | Detail |
|---|---|
| **Aggregate** | `Store` — root; owns `SocialLink` children |
| **Entities** | `SocialLink` |
| **Value objects** | `Username`, `StorePlan` (`free`/`pro`), `SettlementMode` (`auto`/`manual`), `SettlementPolicy` (mode + platform floor), `StoreTheme`, `StoreProfile` (display name, bio, avatar, banner) |
| **Repositories** | `StoreRepository` — `findById`, `findByUsername`, `findByOwnerId`, `existsByUsername`, `save` |
| **Domain services** | `UsernameAvailabilityService` — blocklist + uniqueness; `SettlementPolicyResolver` — combines store mode with the platform floor for a given product risk tier |
| **Factories** | `Store.create(owner, username)` — seeds default plan `free`, mode `auto`, zero balances |
| **Domain events** | `StoreCreated`, `StoreUsernameChanged`, `SettlementModeChanged`, `StorePlanChanged` |
| **Application services** | `StoreService`, `SocialLinkService`, `StoreSettingsService` |
| **Commands** | `CreateStore`, `UpdateStoreProfile`, `ChangeUsername`, `UpdateSettlementMode`, `AddSocialLink`, `UpdateSocialLink`, `RemoveSocialLink`, `ReorderSocialLinks` |
| **Queries** | `GetMyStore`, `GetStoreByUsername`, `CheckUsernameAvailability` |
| **DTOs** | `CreateStoreDto`, `UpdateStoreDto`, `UpdateSettlementModeDto`, `SocialLinkDto`, `StoreResponseDto`, `PublicStoreResponseDto` |
| **Controllers** | `StoresController` (seller), `StoreSettingsController`, `SocialLinksController` |

**Design note.** `SettlementPolicy` is a value object rather than two loose fields because the rule from
`user-behavior.md` §9 — *manual mode may lengthen but never shorten the hold* — is a relationship between
the mode and the floor. Encoding it as a VO with a single `effectiveHoldUntil(paidAt, riskTier)` method
means there is exactly one place the rule can be got wrong. Balances live on the store row but are
mutated only by Ledger; `Store` exposes them as read-only.

---

## 3. Catalog — Tier 2

| Element | Detail |
|---|---|
| **Aggregate** | `Product` — root; owns `DigitalFile` children |
| **Entities** | `DigitalFile` |
| **Value objects** | `Money` (price, hpp), `ProductType` (`digital`/`physical`/`service`), `ProductStatus` (`active`/`draft`/`archived`), `Slug`, `StockLevel` (null = unlimited), `ProductImages` |
| **Repositories** | `ProductRepository` — `findById`, `findBySlug(storeId, slug)`, `listByStore`, `save`, `existsBySlug`; `DigitalFileRepository` |
| **Domain services** | `StockReservationService` — decrement with an oversell guard; `ProductRiskTierResolver` — `ProductType` → holding risk tier, the single source of that mapping |
| **Factories** | `Product.create(storeId, props)` — enforces "digital products must have at least one file before activation" |
| **Domain events** | `ProductCreated`, `ProductUpdated`, `ProductArchived`, `ProductStockDepleted`, `DigitalFileAttached` |
| **Application services** | `ProductService`, `DigitalFileService`, `ProductMediaService` |
| **Commands** | `CreateProduct`, `UpdateProduct`, `ArchiveProduct`, `PublishProduct`, `UploadProductImage`, `AttachDigitalFile`, `RemoveDigitalFile`, `AdjustStock` |
| **Queries** | `ListStoreProducts`, `GetProductDetail`, `ListPublicProducts`, `GetPublicProduct` |
| **DTOs** | `CreateProductDto`, `UpdateProductDto`, `ProductResponseDto`, `PublicProductResponseDto`, `DigitalFileDto` |
| **Controllers** | `ProductsController` (seller), `PublicProductsController` (storefront) |

**Design note.** `ProductRiskTierResolver` lives in Catalog, not Ordering, because the mapping from
product type to dispute risk is a statement about *products*. Ordering asks for the tier and applies the
max across items — it does not need to know why a digital product is low risk. Keeping this here means a
future fourth product type is a one-file change.

---

## 4. Ordering — Tier 1 (full DDD + CQRS)

### Aggregates

| Aggregate | Contents | Guards |
|---|---|---|
| `Order` (root) | `OrderItem[]`, `OrderStatus`, money fields, timestamps, shipping | Every state transition; totals consistency; holding floor; item immutability after creation |
| `Inquiry` (root) | status, optional product/buyer, converted order reference | One conversion only; cannot convert when `lost` |

| Element | Detail |
|---|---|
| **Entities** | `OrderItem` — child of `Order`, never loaded independently |
| **Value objects** | `OrderNumber`, `OrderStatus` (holds the legal-transition table), `OrderSource` (`self_checkout`/`manual`), `HoldingPeriod`, `RiskTier`, `ShippingAddress`, `TrackingInfo`, `Money`, `DiscountApplication` (code + amount), `PlatformFee` (rate + amount), `StatusChangeActor` (`system`/`seller`/`buyer`/`admin` + id) |
| **Repositories** | `OrderRepository` — `findById`, `findByOrderNumber`, `findByMidtransTransactionId`, `save`, `nextOrderNumber(storeId)`; `InquiryRepository`; `OrderReadRepository` (queries only, raw SQL, bypasses the domain) |
| **Domain services** | `HoldingPeriodCalculator` — max risk tier across items, then floored by the Midtrans settlement clock; `OrderPricingService` — subtotal → discount → total → fee, all in `Money`; `OrderTransitionPolicy` — is transition X→Y legal for actor A |
| **Factories** | `OrderFactory.fromCheckout(...)`, `OrderFactory.fromManualCreation(...)` — the *only* two construction paths; both converge on the same private constructor so post-creation behavior cannot diverge |
| **Domain events** | `OrderCreated`, `OrderPaid`, `OrderShipped`, `OrderReleased`, `OrderDisputed`, `OrderRefunded`, `OrderCancelled`, `OrderExpired`, `InquiryCreated`, `InquiryConverted`, `InquiryMarkedLost` |
| **Application services** | Command handlers only — no service class fronting the bus |
| **Commands** | `CreateCheckoutOrder`, `CreateManualOrder`, `MarkOrderPaid`, `ConfirmManualPayment`, `ShipOrder`, `ReleaseOrder`, `DisputeOrder`, `ResolveDispute`, `RefundOrder`, `CancelOrder`, `ExpireOrder`, `CreateInquiry`, `ConvertInquiry`, `MarkInquiryLost` |
| **Queries** | `ListStoreOrders`, `GetOrderDetail`, `ListBuyerOrders`, `GetBuyerOrderDetail`, `ListStoreInquiries`, `GetOrderStatusHistory`, `GetOrdersPendingRelease` |
| **DTOs** | `CreateCheckoutOrderDto`, `CreateManualOrderDto`, `ShipOrderDto`, `DisputeOrderDto`, `RefundOrderDto`, `OrderResponseDto`, `OrderDetailResponseDto`, `BuyerOrderResponseDto`, `InquiryDto`, `OrderStatusHistoryDto` |
| **Controllers** | `CheckoutController`, `SellerOrdersController`, `BuyerOrdersController`, `InquiriesController` |

**Design notes.**

*Aggregate size.* `Order` loads its items on every write because invariants span them — holding tier is
computed across items, and totals must equal the sum of lines. An order has single-digit line counts, so
the load cost is trivial and the correctness gain is large.

*Transitions are methods, never setters.* `order.markPaid(paidAt, method, txId)` returns
`Result<void, DomainError>` and internally appends a status-history record plus a domain event. There is
no public `setStatus`. This is the entire mechanism by which the state machine in
[08](./08-order-state-machine.md) cannot be bypassed.

*Read/write split.* `OrderRepository` returns aggregates for commands. `OrderReadRepository` returns flat
DTOs via `$queryRaw` for lists. The seller's order table needs product names and buyer names across
thousands of rows — hydrating aggregates for that would be absurd, and forcing display fields into the
aggregate would be worse.

---

## 5. Payments — Tier 1

| Element | Detail |
|---|---|
| **Aggregates** | `PaymentTransaction` (root, keyed by order) · `WebhookEvent` (root, append-only) · `Refund` (root) |
| **Entities** | `SettlementReport`, `ReconciliationRun` |
| **Value objects** | `MidtransTransactionStatus`, `PaymentChannel` (`qris`/`va_bca`/`gopay`/`credit_card`/…), `SignatureKey`, `WebhookPayload`, `SnapToken`, `ReconciliationOutcome` (`matched`/`missing_internal`/`missing_external`/`amount_mismatch`) |
| **Repositories** | `WebhookEventRepository` — `save`, `findByTransactionId`, `markProcessed`, `markIgnored`, `markFailed`; `RefundRepository`; `SettlementReportRepository`; `ReconciliationRunRepository` |
| **Domain services** | `SignatureVerifier` — SHA-512 of `order_id + status_code + gross_amount + server_key`; `PaymentStatusMapper` — Midtrans vocabulary → domain events, including the `capture` + `fraud_status=accept` case; `ReconciliationService` — three-way match between settlement report, webhook events and orders |
| **Factories** | `WebhookEvent.fromRawPayload(source, body, headers)` — persists before any interpretation, so a malformed payload is still evidence |
| **Domain events** | `PaymentSettled`, `PaymentPending`, `PaymentFailed`, `PaymentExpired`, `RefundCompleted`, `RefundFailed`, `ReconciliationMismatchDetected` |
| **Application services** | `SnapTokenService`, `WebhookIngestionService`, `WebhookProcessingService`, `RefundService`, `ReconciliationService` |
| **Commands** | `CreateSnapTransaction`, `IngestWebhook`, `ProcessWebhookEvent`, `IssueRefund`, `RunDailyReconciliation`, `PollPaymentStatus` |
| **Queries** | `GetPaymentStatus`, `ListWebhookEvents`, `GetReconciliationRun`, `ListReconciliationMismatches` |
| **DTOs** | `CreateSnapTransactionDto`, `MidtransWebhookDto`, `SnapTokenResponseDto`, `RefundRequestDto`, `ReconciliationReportDto` |
| **Controllers** | `MidtransWebhookController` (public, signature-verified), `AdminReconciliationController` |

**Design notes.**

*Ingestion and processing are separate commands, deliberately.* `IngestWebhook` does the minimum
possible synchronous work — verify signature, persist raw, return `200` — then enqueues processing.
Midtrans treats a slow or failing response as a delivery failure and retries; doing ledger work inline
turns one slow query into a retry storm.

*The webhook event is the idempotency key.* Before processing, look up
`(source, payload->>'transaction_id', transaction_status)`. Already processed → mark `ignored` and stop.
This is why `database-schema.md` deliberately declined a unique constraint there: duplicates must be
*recorded* and then ignored, not rejected at the database and lost.

---

## 6. Ledger & Payouts — Tier 1

| Element | Detail |
|---|---|
| **Aggregates** | `StoreBalance` (root, one per store — the concurrency boundary) · `Withdrawal` (root) · `BankAccount` (root) |
| **Entities** | `BalanceTransaction` — immutable, created only through `StoreBalance` |
| **Value objects** | `Money`, `BalanceTransactionType` (`order_paid_holding`/`order_released`/`withdrawal_paid`/`refund_debit`/`promo_adjustment`), `BalanceSnapshot` (holding + available after), `WithdrawalStatus` (`requested`/`paid`/`rejected`), `BankAccountSnapshot` (bank, number, holder name) |
| **Repositories** | `StoreBalanceRepository` — `findForUpdate(storeId)` (row lock), `save`; `BalanceTransactionRepository` — `append`, `listByStore`, `sumByStore`; `WithdrawalRepository`; `BankAccountRepository` |
| **Domain services** | `BalanceReconciler` — recompute cached balances from the ledger and report drift; `PlatformRevenueCalculator` — derived from released, non-refunded orders per `database-schema.md`; `SellerLiabilityCalculator` — holding + available across all stores |
| **Factories** | `BalanceTransaction.create(...)` — private to `StoreBalance`; nothing else can construct one |
| **Domain events** | `BalanceCredited`, `BalanceReleased`, `BalanceDebited`, `WithdrawalRequested`, `WithdrawalApproved`, `WithdrawalPaid`, `WithdrawalRejected`, `BalanceDriftDetected` |
| **Application services** | `LedgerService`, `WithdrawalService`, `BankAccountService`, `PlatformFinanceService` |
| **Commands** | `CreditHoldingBalance`, `ReleaseToAvailable`, `DebitForWithdrawal`, `DebitForRefund`, `RequestWithdrawal`, `ApproveWithdrawal`, `RejectWithdrawal`, `MarkWithdrawalPaid`, `AddBankAccount`, `SetDefaultBankAccount`, `VerifyBalances` |
| **Queries** | `GetStoreBalance`, `ListBalanceTransactions`, `ListWithdrawals`, `ListPendingWithdrawals`, `GetPlatformRevenue`, `GetTotalSellerLiability` |
| **DTOs** | `RequestWithdrawalDto`, `ApproveWithdrawalDto`, `BankAccountDto`, `BalanceResponseDto`, `BalanceTransactionDto`, `WithdrawalResponseDto` |
| **Controllers** | `BalanceController` (seller), `WithdrawalsController` (seller), `AdminWithdrawalsController`, `AdminFinanceController` |

**Design notes.**

*`StoreBalance` as an aggregate root is the whole point.* It is loaded `FOR UPDATE`, mutated by a method
that simultaneously appends a `BalanceTransaction` carrying the resulting snapshot, and saved — all in one
transaction. Two concurrent withdrawal requests serialize on that row lock. Without an aggregate here,
"check balance then debit" is a textbook TOCTOU double-spend.

*Every ledger row carries `holding_balance_after` and `available_balance_after`.* Redundant on paper,
invaluable in practice: reconstructing history from deltas requires trusting every prior row, while
snapshots let any single row be verified in isolation, and pinpoint exactly where drift began.

*Platform revenue has no ledger table*, per `database-schema.md`. It is derived. That is right at MVP
scale and the decision is revisited only when revenue needs an audit trail independent of seller balances.

---

## 7. Invoicing — Tier 2

| Element | Detail |
|---|---|
| **Aggregate** | `Invoice` — root |
| **Value objects** | `InvoiceNumber` (per-store sequential, gapless), `DeliveryChannel` (`wa`/`email`/`both`), `InvoiceStatus` |
| **Repositories** | `InvoiceRepository` — `findByOrderId`, `findByNumber`, `save`, `nextInvoiceNumber(storeId)` |
| **Domain services** | `InvoiceNumberGenerator` — counter row incremented inside the transaction; `InvoiceRenderer` — order snapshot → HTML → PDF |
| **Factories** | `Invoice.fromOrder(order, store, buyer)` — snapshots everything, so a later product edit never alters an issued invoice |
| **Domain events** | `InvoiceGenerated`, `InvoiceDelivered`, `InvoiceDeliveryFailed` |
| **Application services** | `InvoiceService`, `InvoiceDeliveryService` |
| **Commands** | `GenerateInvoice`, `DeliverInvoice`, `RegenerateInvoicePdf`, `ResendInvoice` |
| **Queries** | `GetInvoiceByOrder`, `ListStoreInvoices`, `GetInvoicePdfUrl` |
| **DTOs** | `InvoiceResponseDto`, `ResendInvoiceDto` |
| **Controllers** | `InvoicesController` (seller), `BuyerInvoicesController` |

**Design note.** `GenerateInvoice` is idempotent on `order_id` (unique in the schema). A retried job finds
the existing invoice, re-renders the PDF to the same storage path, and does not consume a second number.
Burning invoice numbers on retries produces gaps, and gaps in a numbered financial document are the kind
of thing that is very hard to explain after the fact.

---

## 8. Delivery — Tier 2

| Element | Detail |
|---|---|
| **Aggregate** | `DigitalDelivery` — root |
| **Value objects** | `DownloadAllowance` (count + max), `SignedUrl` (transient — never persisted), `FilePath` |
| **Repositories** | `DigitalDeliveryRepository` — `findById`, `findByOrderItemId`, `listByBuyer`, `save` |
| **Domain services** | `SignedUrlIssuer` — wraps Supabase Storage signing; `DownloadPolicy` — may this buyer download now |
| **Factories** | `DigitalDelivery.provision(orderItem, digitalFile)` |
| **Domain events** | `DeliveryProvisioned`, `FileDownloaded`, `DownloadLimitReached` |
| **Application services** | `DeliveryService` |
| **Commands** | `ProvisionDigitalDelivery`, `RecordDownload`, `ExtendDownloadAllowance` |
| **Queries** | `GetDeliveryForOrderItem`, `ListBuyerDeliveries` |
| **DTOs** | `DeliveryResponseDto`, `DownloadUrlResponseDto` |
| **Controllers** | `DeliveriesController` (buyer) |

**Design note.** `RecordDownload` increments the counter **before** issuing the URL. Optimistic ordering
would let a failed issuance still burn an allowance; the reverse would let a user farm unlimited URLs by
aborting. Incrementing first is the conservative choice, and `ExtendDownloadAllowance` exists so support
can fix the rare legitimate case.

---

## 9. CRM — Tier 3

| Element | Detail |
|---|---|
| **Aggregates / VOs** | None. `StoreBuyer` is a read-oriented record with derived totals |
| **Repositories** | `StoreBuyerRepository` — `upsertOnPurchase`, `findByStoreAndBuyer`, `listByStore` (search, sort, cursor), `updateNotes`, `updateTags`, `decrementOnRefund` |
| **Domain events** | None published. Consumes `OrderPaid`, `OrderRefunded` |
| **Application services** | `StoreBuyerService`, `BuyerExportService`, `InquiryFollowUpService` |
| **Commands** | `UpsertStoreBuyerFromOrder`, `UpdateBuyerNotes`, `AddBuyerTag`, `RemoveBuyerTag`, `ExportBuyers` |
| **Queries** | `ListStoreBuyers`, `GetStoreBuyerDetail`, `GetBuyerOrderHistory`, `ListLostInquiries` |
| **DTOs** | `StoreBuyerResponseDto`, `StoreBuyerDetailDto`, `UpdateBuyerNotesDto`, `BuyerExportRowDto` |
| **Controllers** | `BuyersController` |

**Design note.** The upsert is triggered by the `OrderPaid` event and is idempotent on
`(store_id, buyer_id, order_id)` — recomputing totals from orders rather than blindly incrementing, so a
replayed event cannot inflate a buyer's lifetime spend. This matters: the CRM numbers are the product's
credibility, and a double-counted total is immediately visible to the seller.

---

## 10. Promotions — Tier 2

| Element | Detail |
|---|---|
| **Aggregate** | `Promotion` — root; owns product scope |
| **Entities** | `PromotionRedemption` |
| **Value objects** | `PromotionCode`, `DiscountType` (`percent`/`fixed`), `DiscountValue`, `UsageLimits` (total + per buyer), `PromotionScope` (`all`/`specific`), `DateRange` |
| **Repositories** | `PromotionRepository` — `findByCode(storeId, code)`, `listByStore`, `save`; `PromotionRedemptionRepository` — `countByPromotion`, `countByPromotionAndBuyer`, `save`, `release` |
| **Domain services** | `PromotionValidator` — active, in window, min purchase, scope match, limits; `DiscountCalculator` — returns `Money`, never exceeding subtotal; `MarginGuard` — advisory below-HPP warning |
| **Factories** | `Promotion.create(storeId, props)` |
| **Domain events** | `PromotionCreated`, `PromotionRedeemed`, `PromotionRedemptionReleased`, `PromotionExhausted` |
| **Application services** | `PromotionService`, `PromotionApplicationService` |
| **Commands** | `CreatePromotion`, `UpdatePromotion`, `DeactivatePromotion`, `RecordRedemption`, `ReleaseRedemption` |
| **Queries** | `ListStorePromotions`, `ValidatePromotionCode`, `GetPromotionPerformance` |
| **DTOs** | `CreatePromotionDto`, `UpdatePromotionDto`, `ValidatePromotionDto`, `PromotionResponseDto`, `DiscountPreviewDto` |
| **Controllers** | `PromotionsController` (seller), `PublicPromotionsController` (validate at checkout) |

**Design note.** `DiscountCalculator` clamps at subtotal. A 100%-off promo on a Rp10.000 product must
produce a Rp0 order, never a negative total that would credit a seller's holding balance. Clamping in the
calculator means every caller inherits the protection.

---

## 11. Billing — Tier 2

| Element | Detail |
|---|---|
| **Aggregate** | `Subscription` — root; owns `SubscriptionInvoice` children |
| **Entities** | `SubscriptionInvoice` |
| **Value objects** | `PlanTier` (`free`/`pro`), `SubscriptionStatus` (`active`/`trialing`/`past_due`/`cancelled`), `BillingCycle`, `BillingPeriod`, `PlatformFeeRate` |
| **Repositories** | `SubscriptionRepository` — `findActiveByStore`, `findById`, `save`, `listDueForRenewal`; `SubscriptionInvoiceRepository` |
| **Domain services** | `PlanFeatureResolver` — plan → feature set (the single gating authority); `FeeRateResolver` — plan → platform fee rate; `DunningPolicy` — retry schedule before `past_due` |
| **Factories** | `Subscription.start(store, plan, price)` |
| **Domain events** | `SubscriptionActivated`, `SubscriptionRenewed`, `SubscriptionPastDue`, `SubscriptionCancelled`, `PlanChanged` |
| **Application services** | `SubscriptionService`, `BillingCycleService`, `FeatureGateService` |
| **Commands** | `StartSubscription`, `RenewSubscription`, `CancelSubscription`, `MarkSubscriptionPastDue`, `RecordSubscriptionPayment` |
| **Queries** | `GetStoreSubscription`, `ListSubscriptionInvoices`, `GetPlanFeatures`, `ResolveFeeRate` |
| **DTOs** | `StartSubscriptionDto`, `SubscriptionResponseDto`, `SubscriptionInvoiceDto`, `PlanFeaturesDto` |
| **Controllers** | `SubscriptionsController`, `PlansController` |

**Design note.** `PlanFeatureResolver` is the only place features are gated, and it is consulted
**server-side on every gated action** — never merely used to hide a button. A hidden button is a UI
courtesy; an unguarded endpoint is a free Pro tier.

---

## 12. Notifications — Tier 3

| Element | Detail |
|---|---|
| **Ports** | `NotificationChannel` — `send(recipient, message): Promise<DeliveryResult>`; implemented by `EmailChannel` and `WhatsAppChannel` |
| **Value objects** | `NotificationTemplate`, `Recipient` (email + phone), `DeliveryResult`, `ChannelType` |
| **Repositories** | `NotificationDeliveryRepository` — `save`, `listFailedForRetry`, `markDelivered` |
| **Application services** | `NotificationDispatcher`, `TemplateRenderer` |
| **Commands** | `SendNotification`, `RetryFailedNotification` |
| **Queries** | `ListNotificationDeliveries` |
| **DTOs** | `SendNotificationDto`, `NotificationDeliveryDto` |
| **Controllers** | `AdminNotificationsController` (delivery inspection only) |

**Templates:** `invoice_ready`, `order_paid_seller`, `order_paid_buyer`, `order_shipped`,
`order_released`, `order_disputed`, `order_refunded`, `order_expiring_soon`, `withdrawal_requested`,
`withdrawal_paid`, `withdrawal_rejected`, `digital_delivery_ready`, `subscription_past_due`.

---

## 13. Administration — Tier 3

| Element | Detail |
|---|---|
| **Value objects** | `AuditAction` (`product.updated`, `store.settlement_mode_changed`, `withdrawal.approved`, …), `ActorType` (`user`/`admin`/`system`), `AuditMetadata` (before/after) |
| **Repositories** | `AuditLogRepository` — `append`, `listByEntity`, `listByActor`, `search` |
| **Ports** | `AuditLogPort` — the one sanctioned cross-context write, callable from any module |
| **Application services** | `AuditService`, `AdminWithdrawalService`, `AdminDisputeService`, `PlatformMetricsService`, `SupportLookupService` |
| **Commands** | `RecordAuditLog`, `ApproveWithdrawalAsAdmin`, `RejectWithdrawalAsAdmin`, `ResolveDisputeAsAdmin`, `OverrideStorePlan` |
| **Queries** | `ListAuditLogs`, `GetPlatformMetrics`, `ListPendingWithdrawals`, `ListOpenDisputes`, `LookupStore`, `LookupUser`, `GetReconciliationStatus` |
| **DTOs** | `AuditLogDto`, `PlatformMetricsDto`, `AdminWithdrawalDto`, `AdminDisputeDto` |
| **Controllers** | `AdminWithdrawalsController`, `AdminDisputesController`, `AdminMetricsController`, `AdminAuditController`, `AdminSupportController` |

---

## 14. Reporting — Tier 3, read-only

| Element | Detail |
|---|---|
| **Repositories** | `ReportingReadRepository` — raw SQL only, no writes |
| **Application services** | `RevenueReportService`, `ProfitReportService`, `ProductPerformanceService`, `DashboardSummaryService` |
| **Queries** | `GetRevenueByPeriod`, `GetGrossProfit`, `GetProductPerformance`, `GetDashboardSummary`, `GetBuyerAcquisitionStats` |
| **DTOs** | `RevenueReportDto`, `ProfitReportDto`, `ProductPerformanceDto`, `DashboardSummaryDto` |
| **Controllers** | `ReportsController`, `DashboardController` |

**Design note.** Gross profit reads `order_items.hpp_snapshot` exclusively — never `products.hpp`. Any
join to `products` in a profit query is a defect, because it makes last month's reported profit change
when a seller edits a price today. Worth an explicit test.

---

## 15. Storefront — Tier 3, read-only

| Element | Detail |
|---|---|
| **Repositories** | `StorefrontReadRepository` |
| **Application services** | `StorefrontService` |
| **Queries** | `GetStorefrontByUsername`, `GetStorefrontProduct`, `ListStorefrontProducts` |
| **DTOs** | `StorefrontResponseDto`, `StorefrontProductDto` |
| **Controllers** | `StorefrontController` (public, cached, rate-limited) |

---

## 16. Domain event catalogue

Every event and who reacts. This is the system's real control flow — worth keeping accurate.

| Event | Publisher | Consumers |
|---|---|---|
| `UserRegistered` | Identity | Notifications |
| `StoreCreated` | Store | Notifications, Administration (audit) |
| `SettlementModeChanged` | Store | Administration (audit) |
| `OrderCreated` | Ordering | Payments (Snap token), Notifications |
| `PaymentSettled` | Payments | Ordering (`MarkOrderPaid`) |
| `PaymentFailed` / `PaymentExpired` | Payments | Ordering (`CancelOrder` / `ExpireOrder`) |
| `OrderPaid` | Ordering | Ledger (credit holding), Invoicing, Delivery, CRM, Promotions, Catalog (stock), Notifications |
| `OrderShipped` | Ordering | Notifications, Ordering (recompute `holding_until`) |
| `OrderReleased` | Ordering | Ledger (holding → available), Notifications |
| `OrderDisputed` | Ordering | Ledger (freeze), Administration, Notifications |
| `OrderRefunded` | Ordering | Ledger (debit), CRM (decrement), Promotions (release), Notifications |
| `OrderExpired` / `OrderCancelled` | Ordering | Catalog (restore stock), Notifications |
| `InvoiceGenerated` | Invoicing | Notifications |
| `DeliveryProvisioned` | Delivery | Notifications |
| `WithdrawalRequested` | Ledger | Administration, Notifications |
| `WithdrawalPaid` / `WithdrawalRejected` | Ledger | Notifications, Administration (audit) |
| `BalanceDriftDetected` | Ledger | Administration (alert) |
| `ReconciliationMismatchDetected` | Payments | Administration (alert) |
| `SubscriptionActivated` / `PlanChanged` | Billing | Store (plan cache), Notifications |
| `PromotionRedeemed` | Promotions | Reporting |

Events that move money or make a user-visible promise go through the **outbox**. The rest may use the
in-process bus. See [09 §6](./09-payments-ledger.md#6-outbox--event-flow).

---

Next: [05 — API Roadmap](./05-api-roadmap.md)
