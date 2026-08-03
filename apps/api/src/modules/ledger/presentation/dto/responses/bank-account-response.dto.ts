import { BankAccount } from '../../../domain/entities/bank-account.aggregate';

export class BankAccountResponseDto {
  id!: string;
  bankCode!: string;
  bankName!: string;
  accountNumber!: string;
  accountHolderName!: string;
  isDefault!: boolean;
  verifiedAt!: string | null;
  createdAt!: string;

  static fromDomain(bankAccount: BankAccount): BankAccountResponseDto {
    const dto = new BankAccountResponseDto();
    dto.id = bankAccount.id;
    dto.bankCode = bankAccount.snapshot.bankCode;
    dto.bankName = bankAccount.snapshot.bankName;
    dto.accountNumber = bankAccount.snapshot.accountNumber;
    dto.accountHolderName = bankAccount.snapshot.accountHolderName;
    dto.isDefault = bankAccount.isDefault;
    dto.verifiedAt = bankAccount.verifiedAt ? bankAccount.verifiedAt.toISOString() : null;
    dto.createdAt = bankAccount.createdAt.toISOString();
    return dto;
  }
}
