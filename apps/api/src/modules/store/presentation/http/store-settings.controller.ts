import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { StoreSettingsService } from '../../application/services/store-settings.service';
import { StoreOwnerGuard } from '../guards/store-owner.guard';
import { UpdateSettlementDto } from '../dto/requests/update-settlement.dto';
import { StoreSettingsResponseDto } from '../dto/responses/store-settings-response.dto';

@ApiTags('stores')
@Controller('stores/me/settings')
@UseGuards(StoreOwnerGuard)
export class StoreSettingsController {
  constructor(
    private readonly settings: StoreSettingsService,
    private readonly config: AppConfigService,
  ) {}

  private floorConfig() {
    return {
      holdingDaysDigital: this.config.holdingDaysDigital,
      holdingDaysPhysical: this.config.holdingDaysPhysical,
      holdingDaysService: this.config.holdingDaysService,
      midtransSettlementDays: this.config.midtransSettlementDays,
      autoForceReleaseDays: this.config.autoForceReleaseDays,
    };
  }

  @Get()
  async getSettings(@CurrentUser() user: CurrentUserPayload): Promise<StoreSettingsResponseDto> {
    const result = await this.settings.getSettings(user.id);
    return StoreSettingsResponseDto.fromDomain(unwrapOrThrow(result), this.floorConfig());
  }

  @Patch('settlement')
  async changeSettlementMode(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateSettlementDto,
  ): Promise<StoreSettingsResponseDto> {
    const result = await this.settings.changeSettlementMode(user.id, dto.mode);
    return StoreSettingsResponseDto.fromDomain(unwrapOrThrow(result), this.floorConfig());
  }
}
