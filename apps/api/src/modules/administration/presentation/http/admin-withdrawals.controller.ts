import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { Roles } from '../../../../shared/presentation/decorators/roles.decorator';
import { decodeCursor, encodeCursor } from '../../../../shared/kernel/cursor';
import { CursorPaginated } from '../../../../shared/presentation/dto/cursor-paginated.dto';
import { RejectWithdrawalDto } from '../../../ledger/presentation/dto/requests/reject-withdrawal.dto';
import { WithdrawalResponseDto } from '../../../ledger/presentation/dto/responses/withdrawal-response.dto';
import { AdminWithdrawalService } from '../../application/services/admin-withdrawal.service';
import { AdminWithdrawalQueryDto } from '../dto/requests/admin-withdrawal-query.dto';
import { AdminWithdrawalResponseDto } from '../dto/responses/admin-withdrawal-response.dto';

const ADMIN_THROTTLE = { default: { limit: 600, ttl: 60_000 } };

@ApiTags('admin')
@Controller('admin/withdrawals')
@Roles('admin')
@Throttle(ADMIN_THROTTLE)
export class AdminWithdrawalsController {
  constructor(private readonly adminWithdrawals: AdminWithdrawalService) {}

  @Get()
  async list(@Query() query: AdminWithdrawalQueryDto): Promise<CursorPaginated<AdminWithdrawalResponseDto>> {
    const cursor = query.cursor ? unwrapOrThrow(decodeCursor(query.cursor)) : undefined;

    const { rows, hasMore } = await this.adminWithdrawals.listQueue({
      status: query.status,
      limit: query.limit,
      cursor: cursor ? { sortValue: cursor.k, id: cursor.i } : undefined,
    });

    const lastRow = rows[rows.length - 1];
    const nextCursor = hasMore && lastRow ? encodeCursor({ k: lastRow.requestedAt.toISOString(), i: lastRow.id }) : null;

    return CursorPaginated.of(
      rows.map((row) => AdminWithdrawalResponseDto.fromRow(row)),
      { nextCursor, hasMore },
    );
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @CurrentUser() admin: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<WithdrawalResponseDto> {
    const result = await this.adminWithdrawals.approve(id, admin.id);
    return WithdrawalResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @CurrentUser() admin: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: RejectWithdrawalDto,
  ): Promise<WithdrawalResponseDto> {
    const result = await this.adminWithdrawals.reject(id, admin.id, dto.reason);
    return WithdrawalResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Post(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  async markPaid(
    @CurrentUser() admin: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<WithdrawalResponseDto> {
    const result = await this.adminWithdrawals.markPaid(id, admin.id);
    return WithdrawalResponseDto.fromDomain(unwrapOrThrow(result));
  }
}
