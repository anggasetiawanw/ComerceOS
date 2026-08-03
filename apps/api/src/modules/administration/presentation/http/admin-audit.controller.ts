import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../../../shared/presentation/decorators/roles.decorator';
import { decodeCursor, encodeCursor } from '../../../../shared/kernel/cursor';
import { CursorPaginated } from '../../../../shared/presentation/dto/cursor-paginated.dto';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { AuditService } from '../../application/services/audit.service';
import { AuditLogQueryDto } from '../dto/requests/audit-log-query.dto';
import { AuditLogResponseDto } from '../dto/responses/audit-log-response.dto';

const ADMIN_THROTTLE = { default: { limit: 600, ttl: 60_000 } };

@ApiTags('admin')
@Controller('admin/audit-logs')
@Roles('admin')
@Throttle(ADMIN_THROTTLE)
export class AdminAuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  async list(@Query() query: AuditLogQueryDto): Promise<CursorPaginated<AuditLogResponseDto>> {
    const cursor = query.cursor ? unwrapOrThrow(decodeCursor(query.cursor)) : undefined;

    const { rows, hasMore } = await this.audit.list({
      entityType: query.entityType,
      actorId: query.actorId,
      action: query.action,
      limit: query.limit,
      cursor: cursor ? { sortValue: cursor.k, id: cursor.i } : undefined,
    });

    const lastRow = rows[rows.length - 1];
    const nextCursor = hasMore && lastRow ? encodeCursor({ k: lastRow.createdAt.toISOString(), i: lastRow.id }) : null;

    return CursorPaginated.of(
      rows.map((row) => AuditLogResponseDto.fromRow(row)),
      { nextCursor, hasMore },
    );
  }
}
