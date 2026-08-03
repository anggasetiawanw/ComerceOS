import { Withdrawal } from '../../../domain/entities/withdrawal.aggregate';
import { WithdrawalRow } from '../../../domain/repositories/withdrawal-read.repository';

export class WithdrawalResponseDto {
  id!: string;
  storeId!: string;
  amount!: string;
  status!: string;
  bankCode!: string;
  bankName!: string;
  accountNumber!: string;
  accountHolderName!: string;
  requestedAt!: string;
  approvedAt!: string | null;
  rejectedAt!: string | null;
  paidAt!: string | null;
  adminNote!: string | null;

  static fromDomain(withdrawal: Withdrawal): WithdrawalResponseDto {
    const dto = new WithdrawalResponseDto();
    dto.id = withdrawal.id;
    dto.storeId = withdrawal.storeId;
    dto.amount = withdrawal.amount.toString();
    dto.status = withdrawal.status.value;
    dto.bankCode = withdrawal.snapshot.bankCode;
    dto.bankName = withdrawal.snapshot.bankName;
    dto.accountNumber = withdrawal.snapshot.accountNumber;
    dto.accountHolderName = withdrawal.snapshot.accountHolderName;
    dto.requestedAt = withdrawal.requestedAt.toISOString();
    dto.approvedAt = withdrawal.approvedAt ? withdrawal.approvedAt.toISOString() : null;
    dto.rejectedAt = withdrawal.rejectedAt ? withdrawal.rejectedAt.toISOString() : null;
    dto.paidAt = withdrawal.paidAt ? withdrawal.paidAt.toISOString() : null;
    dto.adminNote = withdrawal.adminNote;
    return dto;
  }

  static fromRow(row: WithdrawalRow): WithdrawalResponseDto {
    const dto = new WithdrawalResponseDto();
    dto.id = row.id;
    dto.storeId = row.storeId;
    dto.amount = row.amount;
    dto.status = row.status;
    dto.bankCode = row.bankCode;
    dto.bankName = row.bankName;
    dto.accountNumber = row.accountNumber;
    dto.accountHolderName = row.accountHolderName;
    dto.requestedAt = row.requestedAt.toISOString();
    dto.approvedAt = row.approvedAt ? row.approvedAt.toISOString() : null;
    dto.rejectedAt = row.rejectedAt ? row.rejectedAt.toISOString() : null;
    dto.paidAt = row.paidAt ? row.paidAt.toISOString() : null;
    dto.adminNote = row.adminNote;
    return dto;
  }
}
