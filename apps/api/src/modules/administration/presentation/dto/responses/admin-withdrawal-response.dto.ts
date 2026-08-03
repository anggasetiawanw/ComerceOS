import { AdminWithdrawalRow } from '../../../../ledger/domain/repositories/withdrawal-read.repository';

export class AdminWithdrawalResponseDto {
  id!: string;
  storeId!: string;
  storeUsername!: string;
  storeDisplayName!: string;
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

  static fromRow(row: AdminWithdrawalRow): AdminWithdrawalResponseDto {
    const dto = new AdminWithdrawalResponseDto();
    dto.id = row.id;
    dto.storeId = row.storeId;
    dto.storeUsername = row.storeUsername;
    dto.storeDisplayName = row.storeDisplayName;
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
