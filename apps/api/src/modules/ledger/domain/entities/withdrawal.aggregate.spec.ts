import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { BankAccountSnapshot } from '../value-objects/bank-account-snapshot.vo';
import { Withdrawal } from './withdrawal.aggregate';
import { IllegalWithdrawalTransitionError } from '../errors/ledger.errors';

const money = (amount: number) => Money.fromRupiah(amount).unwrap();

const snapshot = () =>
  BankAccountSnapshot.create({ bankCode: 'bca', accountNumber: '1234567890', accountHolderName: 'Seller One' }).unwrap();

const requested = () =>
  Withdrawal.request({ storeId: 'store-1', bankAccountId: 'bank-1', amount: money(100_000), snapshot: snapshot() });

describe('Withdrawal aggregate', () => {
  describe('request', () => {
    it('starts in requested status with no reviewer or timestamps set', () => {
      const withdrawal = requested();

      expect(withdrawal.status.value).toBe('requested');
      expect(withdrawal.approvedAt).toBeNull();
      expect(withdrawal.rejectedAt).toBeNull();
      expect(withdrawal.paidAt).toBeNull();
      expect(withdrawal.reviewedById).toBeNull();
    });

    it('emits a WithdrawalRequestedEvent', () => {
      const withdrawal = requested();
      const events = withdrawal.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]!.eventName).toBe('ledger.withdrawal_requested');
    });
  });

  describe('legal transitions', () => {
    it('requested -> approved sets approvedAt and reviewedById', () => {
      const withdrawal = requested();
      const result = withdrawal.approve('admin-1');

      expect(result.isOk()).toBe(true);
      expect(withdrawal.status.value).toBe('approved');
      expect(withdrawal.approvedAt).not.toBeNull();
      expect(withdrawal.reviewedById).toBe('admin-1');
    });

    it('requested -> rejected sets rejectedAt, reviewedById, adminNote, and emits WithdrawalRejectedEvent', () => {
      const withdrawal = requested();
      withdrawal.pullDomainEvents();
      const result = withdrawal.reject('admin-1', 'akun mencurigakan');

      expect(result.isOk()).toBe(true);
      expect(withdrawal.status.value).toBe('rejected');
      expect(withdrawal.rejectedAt).not.toBeNull();
      expect(withdrawal.adminNote).toBe('akun mencurigakan');

      const events = withdrawal.pullDomainEvents();
      expect(events.map((event) => event.eventName)).toEqual(['ledger.withdrawal_rejected']);
    });

    it('approved -> paid sets paidAt and emits WithdrawalPaidEvent', () => {
      const withdrawal = requested();
      withdrawal.approve('admin-1');
      withdrawal.pullDomainEvents();

      const result = withdrawal.markPaid('admin-1');

      expect(result.isOk()).toBe(true);
      expect(withdrawal.status.value).toBe('paid');
      expect(withdrawal.paidAt).not.toBeNull();

      const events = withdrawal.pullDomainEvents();
      expect(events.map((event) => event.eventName)).toEqual(['ledger.withdrawal_paid']);
    });

    it('approved -> rejected is legal (a transfer failed at the bank)', () => {
      const withdrawal = requested();
      withdrawal.approve('admin-1');

      const result = withdrawal.reject('admin-1', 'transfer gagal');

      expect(result.isOk()).toBe(true);
      expect(withdrawal.status.value).toBe('rejected');
    });
  });

  describe('forbidden transitions', () => {
    it('requested -> paid is illegal (must be approved first)', () => {
      const withdrawal = requested();
      const result = withdrawal.markPaid('admin-1');

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(IllegalWithdrawalTransitionError);
      expect(withdrawal.status.value).toBe('requested');
    });

    it('paid -> anything is illegal (terminal)', () => {
      const withdrawal = requested();
      withdrawal.approve('admin-1');
      withdrawal.markPaid('admin-1');

      const approveAgain = withdrawal.approve('admin-2');
      const rejectAfterPaid = withdrawal.reject('admin-2');
      const markPaidAgain = withdrawal.markPaid('admin-2');

      expect(approveAgain.isErr()).toBe(true);
      expect(rejectAfterPaid.isErr()).toBe(true);
      expect(markPaidAgain.isErr()).toBe(true);
      expect(withdrawal.status.value).toBe('paid');
    });

    it('rejected -> anything is illegal (terminal)', () => {
      const withdrawal = requested();
      withdrawal.reject('admin-1');

      const approveAfterReject = withdrawal.approve('admin-2');
      const markPaidAfterReject = withdrawal.markPaid('admin-2');

      expect(approveAfterReject.isErr()).toBe(true);
      expect(markPaidAfterReject.isErr()).toBe(true);
      expect(withdrawal.status.value).toBe('rejected');
    });

    it('a second markPaid call on an already-paid withdrawal fails — the replay guard', () => {
      const withdrawal = requested();
      withdrawal.approve('admin-1');
      const first = withdrawal.markPaid('admin-1');
      const second = withdrawal.markPaid('admin-1');

      expect(first.isOk()).toBe(true);
      expect(second.isErr()).toBe(true);
      expect(second.unwrapErr()).toBeInstanceOf(IllegalWithdrawalTransitionError);
    });
  });

  it('isPending is true for requested/approved and false for paid/rejected', () => {
    const requestedWithdrawal = requested();
    expect(requestedWithdrawal.isPending()).toBe(true);

    requestedWithdrawal.approve('admin-1');
    expect(requestedWithdrawal.isPending()).toBe(true);

    requestedWithdrawal.markPaid('admin-1');
    expect(requestedWithdrawal.isPending()).toBe(false);

    const rejectedWithdrawal = requested();
    rejectedWithdrawal.reject('admin-1');
    expect(rejectedWithdrawal.isPending()).toBe(false);
  });

  it('belongsToStore checks the store id', () => {
    const withdrawal = requested();
    expect(withdrawal.belongsToStore('store-1')).toBe(true);
    expect(withdrawal.belongsToStore('store-2')).toBe(false);
  });
});
