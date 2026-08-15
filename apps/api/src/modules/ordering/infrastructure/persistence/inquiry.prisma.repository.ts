import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Inquiry } from '../../domain/entities/inquiry.aggregate';
import { InquiryRepository } from '../../domain/repositories/inquiry.repository';
import { InquiryMapper } from './inquiry.mapper';

@Injectable()
export class InquiryPrismaRepository implements InquiryRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async findById(id: UniqueId): Promise<Inquiry | null> {
    const row = await this.transactionManager.client.inquiry.findUnique({ where: { id } });
    return row ? InquiryMapper.toDomain(row) : null;
  }

  async save(inquiry: Inquiry): Promise<void> {
    await this.transactionManager.client.inquiry.upsert({
      where: { id: inquiry.id },
      create: InquiryMapper.toPersistenceCreate(inquiry),
      update: InquiryMapper.toPersistenceUpdate(inquiry),
    });
  }
}
