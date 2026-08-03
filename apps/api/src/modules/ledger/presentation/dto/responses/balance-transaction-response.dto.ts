import { BalanceTransactionRow } from '../../../domain/repositories/balance-read.repository';

export class BalanceTransactionResponseDto {
  id!: string;
  type!: string;
  amount!: string;
  holdingBalanceAfter!: string;
  availableBalanceAfter!: string;
  note!: string | null;
  orderId!: string | null;
  createdAt!: string;

  static fromRow(row: BalanceTransactionRow): BalanceTransactionResponseDto {
    const dto = new BalanceTransactionResponseDto();
    dto.id = row.id;
    dto.type = row.type;
    dto.amount = row.amount;
    dto.holdingBalanceAfter = row.holdingBalanceAfter;
    dto.availableBalanceAfter = row.availableBalanceAfter;
    dto.note = row.note;
    dto.orderId = row.orderId;
    dto.createdAt = row.createdAt.toISOString();
    return dto;
  }
}
