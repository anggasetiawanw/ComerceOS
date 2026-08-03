import { AggregateRoot } from '../../../../shared/kernel/aggregate-root.base';
import { Result } from '../../../../shared/kernel/result';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { BankAccountSnapshot } from '../value-objects/bank-account-snapshot.vo';
import { WithdrawalStatus, WithdrawalStatusValue } from '../value-objects/withdrawal-status.vo';
import { WithdrawalTransitionPolicy } from '../services/withdrawal-transition.policy';
import { WithdrawalRequestedEvent } from '../events/withdrawal-requested.event';
import { WithdrawalPaidEvent } from '../events/withdrawal-paid.event';
import { WithdrawalRejectedEvent } from '../events/withdrawal-rejected.event';
import { IllegalWithdrawalTransitionError } from '../errors/ledger.errors';

const TRANSITION_POLICY = new WithdrawalTransitionPolicy();

export interface WithdrawalProps {
  storeId: string;
  bankAccountId: string | null;
  amount: Money;
  status: WithdrawalStatus;
  snapshot: BankAccountSnapshot;
  requestedAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  paidAt: Date | null;
  reviewedById: string | null;
  adminNote: string | null;
}

// The debit itself is never this aggregate's job — StoreBalance is the
// concurrency boundary for money (.docs/04-entity-design.md §6). markPaid
// only records the withdrawal's own status transition; WithdrawalService
// is what additionally calls StoreBalance.debitForWithdrawal in the same
// transaction (.docs/09-payments-ledger.md §7 — "why the debit happens at
// mark-paid, not at request").
export class Withdrawal extends AggregateRoot<WithdrawalProps> {
  private constructor(props: WithdrawalProps, id?: UniqueId) {
    super(props, id);
  }

  static request(params: {
    storeId: string;
    bankAccountId: string | null;
    amount: Money;
    snapshot: BankAccountSnapshot;
  }): Withdrawal {
    const withdrawal = new Withdrawal({
      storeId: params.storeId,
      bankAccountId: params.bankAccountId,
      amount: params.amount,
      status: WithdrawalStatus.requested(),
      snapshot: params.snapshot,
      requestedAt: new Date(),
      approvedAt: null,
      rejectedAt: null,
      paidAt: null,
      reviewedById: null,
      adminNote: null,
    });

    withdrawal.addDomainEvent(
      new WithdrawalRequestedEvent(withdrawal.id, params.storeId, params.amount.toString()),
    );
    return withdrawal;
  }

  static reconstitute(props: WithdrawalProps, id: UniqueId): Withdrawal {
    return new Withdrawal(props, id);
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get bankAccountId(): string | null {
    return this.props.bankAccountId;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get status(): WithdrawalStatus {
    return this.props.status;
  }

  get snapshot(): BankAccountSnapshot {
    return this.props.snapshot;
  }

  get requestedAt(): Date {
    return this.props.requestedAt;
  }

  get approvedAt(): Date | null {
    return this.props.approvedAt;
  }

  get rejectedAt(): Date | null {
    return this.props.rejectedAt;
  }

  get paidAt(): Date | null {
    return this.props.paidAt;
  }

  get reviewedById(): string | null {
    return this.props.reviewedById;
  }

  get adminNote(): string | null {
    return this.props.adminNote;
  }

  belongsToStore(storeId: string): boolean {
    return this.props.storeId === storeId;
  }

  isPending(): boolean {
    return this.props.status.value === 'requested' || this.props.status.value === 'approved';
  }

  approve(reviewerId: string): Result<void, IllegalWithdrawalTransitionError> {
    const result = this.transition('approved');
    if (result.isErr()) return result;

    this.props.approvedAt = new Date();
    this.props.reviewedById = reviewerId;
    return Result.ok(undefined);
  }

  reject(reviewerId: string, reason?: string | null): Result<void, IllegalWithdrawalTransitionError> {
    const result = this.transition('rejected');
    if (result.isErr()) return result;

    this.props.rejectedAt = new Date();
    this.props.reviewedById = reviewerId;
    this.props.adminNote = reason ?? null;
    this.addDomainEvent(
      new WithdrawalRejectedEvent(this.id, this.props.storeId, this.props.amount.toString(), reason ?? null),
    );
    return Result.ok(undefined);
  }

  markPaid(reviewerId: string): Result<void, IllegalWithdrawalTransitionError> {
    const result = this.transition('paid');
    if (result.isErr()) return result;

    this.props.paidAt = new Date();
    this.props.reviewedById = reviewerId;
    this.addDomainEvent(new WithdrawalPaidEvent(this.id, this.props.storeId, this.props.amount.toString()));
    return Result.ok(undefined);
  }

  private transition(to: WithdrawalStatusValue): Result<void, IllegalWithdrawalTransitionError> {
    const from = this.props.status.value;
    if (!TRANSITION_POLICY.isLegal(from, to)) {
      return Result.err(new IllegalWithdrawalTransitionError(from, to));
    }
    this.props.status = WithdrawalStatus.of(to);
    return Result.ok(undefined);
  }
}
