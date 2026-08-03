import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { CurrentStore } from '../../../store/presentation/decorators/current-store.decorator';
import { CurrentStorePayload, StoreOwnerGuard } from '../../../store/presentation/guards/store-owner.guard';
import { BankAccountService } from '../../application/services/bank-account.service';
import { CreateBankAccountDto } from '../dto/requests/create-bank-account.dto';
import { BankAccountResponseDto } from '../dto/responses/bank-account-response.dto';

@ApiTags('bank-accounts')
@Controller('bank-accounts')
@UseGuards(StoreOwnerGuard)
export class BankAccountsController {
  constructor(private readonly bankAccounts: BankAccountService) {}

  @Get()
  async list(@CurrentStore() store: CurrentStorePayload): Promise<BankAccountResponseDto[]> {
    const accounts = await this.bankAccounts.list(store.id);
    return accounts.map((account) => BankAccountResponseDto.fromDomain(account));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async add(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentStore() store: CurrentStorePayload,
    @Body() dto: CreateBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    const result = await this.bankAccounts.add(store.id, user.id, dto);
    return BankAccountResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Patch(':id/default')
  async setDefault(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentStore() store: CurrentStorePayload,
    @Param('id') id: string,
  ): Promise<{ updated: true }> {
    const result = await this.bankAccounts.setDefault(store.id, user.id, id);
    unwrapOrThrow(result);
    return { updated: true };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentStore() store: CurrentStorePayload,
    @Param('id') id: string,
  ): Promise<{ removed: true }> {
    const result = await this.bankAccounts.remove(store.id, user.id, id);
    unwrapOrThrow(result);
    return { removed: true };
  }
}
