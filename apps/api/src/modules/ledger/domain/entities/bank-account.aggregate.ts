import { AggregateRoot } from '../../../../shared/kernel/aggregate-root.base';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { BankAccountSnapshot } from '../value-objects/bank-account-snapshot.vo';

export interface BankAccountProps {
  storeId: string;
  snapshot: BankAccountSnapshot;
  isDefault: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
}

// A payout destination. Verification (name-match) is reserved but never set
// this sprint — .docs/09-payments-ledger.md §7 says "a verified default bank
// account exists" but nothing populates verified_at yet, so
// WithdrawalService only requires a default account, not a verified one
// (Sprint 7 drift, recorded in .docs/12-roadmap-sprints.md).
export class BankAccount extends AggregateRoot<BankAccountProps> {
  private constructor(props: BankAccountProps, id?: UniqueId) {
    super(props, id);
  }

  static create(params: { storeId: string; snapshot: BankAccountSnapshot; isDefault: boolean }): BankAccount {
    return new BankAccount({
      storeId: params.storeId,
      snapshot: params.snapshot,
      isDefault: params.isDefault,
      verifiedAt: null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: BankAccountProps, id: UniqueId): BankAccount {
    return new BankAccount(props, id);
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get snapshot(): BankAccountSnapshot {
    return this.props.snapshot;
  }

  get isDefault(): boolean {
    return this.props.isDefault;
  }

  get verifiedAt(): Date | null {
    return this.props.verifiedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  belongsToStore(storeId: string): boolean {
    return this.props.storeId === storeId;
  }

  markAsDefault(): void {
    this.props.isDefault = true;
  }

  unmarkAsDefault(): void {
    this.props.isDefault = false;
  }
}
