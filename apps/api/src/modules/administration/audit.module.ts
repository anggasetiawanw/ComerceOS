import { Module } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY } from './domain/repositories/audit-log.repository';
import { AuditLogPrismaRepository } from './infrastructure/persistence/audit-log.prisma.repository';
import { AUDIT_LOG_PORT } from './application/ports/audit-log.port';
import { AuditService } from './application/services/audit.service';

// Standalone — depends only on PrismaService (global) — so ledger/store/
// catalog can import this module directly for AUDIT_LOG_PORT without
// importing AdministrationModule, which itself imports LedgerModule
// (Decision 4, .docs/12-roadmap-sprints.md Sprint 7 drift notes).
@Module({
  providers: [
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogPrismaRepository },
    AuditService,
    { provide: AUDIT_LOG_PORT, useExisting: AuditService },
  ],
  exports: [AUDIT_LOG_PORT, AuditService],
})
export class AuditModule {}
