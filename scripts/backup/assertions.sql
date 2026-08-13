-- Restore-drill assertions, run against the throwaway database that
-- restore-drill.sh just restored a dump into. Anything that raises here
-- fails the drill (psql runs with -v ON_ERROR_STOP=1).

-- 1. Every migration applied cleanly, none rolled back or half-finished.
DO $$
DECLARE
  applied_count integer;
  failed_count integer;
BEGIN
  SELECT count(*) INTO applied_count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;
  SELECT count(*) INTO failed_count FROM _prisma_migrations WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL;
  RAISE NOTICE 'migrations applied: %, failed: %', applied_count, failed_count;
  IF failed_count > 0 THEN
    RAISE EXCEPTION 'restore drill failed: % migration(s) not cleanly applied', failed_count;
  END IF;
END $$;

-- 2. Every core table exists and is queryable, with its row count logged
-- for a human to sanity-check against what they expected to see restored.
DO $$
DECLARE
  t text;
  cnt bigint;
  expected text[] := ARRAY[
    'users', 'stores', 'social_links', 'products', 'digital_files',
    'orders', 'order_items', 'order_status_history', 'webhook_events',
    'digital_deliveries', 'outbox_events', 'balance_transactions',
    'bank_accounts', 'withdrawals', 'audit_logs', 'invoices',
    'store_buyers', 'notification_deliveries'
  ];
BEGIN
  FOREACH t IN ARRAY expected LOOP
    EXECUTE format('SELECT count(*) FROM %I', t) INTO cnt;
    RAISE NOTICE 'table % : % rows', t, cnt;
  END LOOP;
END $$;

-- 3. Ledger reconciliation — the same invariant BalanceReconciler and
-- ledger.int-spec.ts assert: a store's cached balance must equal the sum
-- of its balance_transactions deltas. This is what makes the drill prove
-- the restored data is coherent, not just that pg_restore exited 0.
DO $$
DECLARE
  mismatch_count integer;
BEGIN
  SELECT count(*) INTO mismatch_count
  FROM stores s
  LEFT JOIN (
    SELECT store_id,
           COALESCE(SUM(holding_delta), 0) AS holding_sum,
           COALESCE(SUM(available_delta), 0) AS available_sum
    FROM balance_transactions
    GROUP BY store_id
  ) bt ON bt.store_id = s.id
  WHERE s.holding_balance <> COALESCE(bt.holding_sum, 0)
     OR s.available_balance <> COALESCE(bt.available_sum, 0);

  RAISE NOTICE 'ledger reconciliation mismatches: %', mismatch_count;
  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'restore drill failed: % store(s) have a balance/ledger mismatch', mismatch_count;
  END IF;
END $$;

\echo 'RESTORE DRILL PASSED'
