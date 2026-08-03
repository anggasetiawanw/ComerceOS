import { Prisma, BankAccount as PrismaBankAccount } from '@prisma/client';
import { BankAccount } from '../../domain/entities/bank-account.aggregate';
import { BankAccountSnapshot } from '../../domain/value-objects/bank-account-snapshot.vo';

export class BankAccountMapper {
  static toDomain(row: PrismaBankAccount): BankAccount {
    return BankAccount.reconstitute(
      {
        storeId: row.storeId,
        snapshot: BankAccountSnapshot.reconstitute({
          bankCode: row.bankCode,
          bankName: row.bankName,
          accountNumber: row.accountNumber,
          accountHolderName: row.accountHolderName,
        }),
        isDefault: row.isDefault,
        verifiedAt: row.verifiedAt,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toPersistence(bankAccount: BankAccount): Prisma.BankAccountUncheckedCreateInput {
    return {
      id: bankAccount.id,
      storeId: bankAccount.storeId,
      bankCode: bankAccount.snapshot.bankCode,
      bankName: bankAccount.snapshot.bankName,
      accountNumber: bankAccount.snapshot.accountNumber,
      accountHolderName: bankAccount.snapshot.accountHolderName,
      isDefault: bankAccount.isDefault,
      verifiedAt: bankAccount.verifiedAt,
      createdAt: bankAccount.createdAt,
    };
  }
}
