import { BANK_CODE_VALUES, bankNameForCode } from '@nagihin/contracts';
import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export type BankAccountRejectionReason = 'unknown_bank_code' | 'invalid_account_number' | 'invalid_holder_name';

export class BankAccountSnapshotError extends Error {
  constructor(
    message: string,
    readonly reason: BankAccountRejectionReason,
  ) {
    super(message);
  }
}

interface BankAccountSnapshotProps {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

const ACCOUNT_NUMBER_PATTERN = /^[0-9]{4,20}$/;

// Frozen onto a withdrawal at request time (.docs/09-payments-ledger.md §7)
// so a later bank-account edit never alters a past withdrawal's record —
// also used as the live BankAccount's own value object, since both shapes
// are identical (bank_code/bank_name/account_number/account_holder_name).
export class BankAccountSnapshot extends ValueObject<BankAccountSnapshotProps> {
  private constructor(props: BankAccountSnapshotProps) {
    super(props);
  }

  static create(params: {
    bankCode: string;
    accountNumber: string;
    accountHolderName: string;
  }): Result<BankAccountSnapshot, BankAccountSnapshotError> {
    const bankCode = params.bankCode.trim().toLowerCase();
    if (!BANK_CODE_VALUES.includes(bankCode)) {
      return Result.err(new BankAccountSnapshotError(`Unknown bank code "${params.bankCode}"`, 'unknown_bank_code'));
    }

    const accountNumber = params.accountNumber.trim();
    if (!ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
      return Result.err(
        new BankAccountSnapshotError(`Invalid account number "${params.accountNumber}"`, 'invalid_account_number'),
      );
    }

    const accountHolderName = params.accountHolderName.trim();
    if (accountHolderName.length < 2 || accountHolderName.length > 100) {
      return Result.err(
        new BankAccountSnapshotError('Account holder name must be between 2 and 100 characters', 'invalid_holder_name'),
      );
    }

    const bankName = bankNameForCode(bankCode) ?? bankCode;
    return Result.ok(new BankAccountSnapshot({ bankCode, bankName, accountNumber, accountHolderName }));
  }

  static reconstitute(props: BankAccountSnapshotProps): BankAccountSnapshot {
    return new BankAccountSnapshot(props);
  }

  get bankCode(): string {
    return this.props.bankCode;
  }

  get bankName(): string {
    return this.props.bankName;
  }

  get accountNumber(): string {
    return this.props.accountNumber;
  }

  get accountHolderName(): string {
    return this.props.accountHolderName;
  }

  toJSON(): BankAccountSnapshotProps {
    return { ...this.props };
  }
}
