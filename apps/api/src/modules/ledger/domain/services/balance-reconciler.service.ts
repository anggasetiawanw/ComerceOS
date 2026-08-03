import { Money } from '../../../../shared/kernel/value-objects/money.vo';

export interface BalanceDriftReport {
  storeId: string;
  hasDrift: boolean;
  cachedHolding: bigint;
  ledgerHolding: bigint;
  cachedAvailable: bigint;
  ledgerAvailable: bigint;
}

// Recomputes what stores.holding_balance/available_balance SHOULD be from
// SUM(holding_delta)/SUM(available_delta) and compares against the cache.
// Drift is reported, never auto-corrected — a silent correction hides the
// bug that caused it (.docs/09-payments-ledger.md §9). No caller exists
// yet; Sprint 12's verify-store-balances weekly job is this class's first
// consumer, and the ledger integration suite's invariant test uses it
// directly.
export class BalanceReconciler {
  reconcile(params: {
    storeId: string;
    cachedHolding: Money;
    cachedAvailable: Money;
    ledgerHoldingDelta: bigint;
    ledgerAvailableDelta: bigint;
  }): BalanceDriftReport {
    const hasDrift =
      params.cachedHolding.amount !== params.ledgerHoldingDelta ||
      params.cachedAvailable.amount !== params.ledgerAvailableDelta;

    return {
      storeId: params.storeId,
      hasDrift,
      cachedHolding: params.cachedHolding.amount,
      ledgerHolding: params.ledgerHoldingDelta,
      cachedAvailable: params.cachedAvailable.amount,
      ledgerAvailable: params.ledgerAvailableDelta,
    };
  }
}
