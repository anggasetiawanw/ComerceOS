import { StoreSettings } from '../../../application/services/store-settings.service';

export class StoreSettingsResponseDto {
  settlementMode!: string;
  plan!: string;
  holdingDaysDigital!: number;
  holdingDaysPhysical!: number;
  holdingDaysService!: number;
  midtransSettlementDays!: number;
  autoForceReleaseDays!: number;

  static fromDomain(
    settings: StoreSettings,
    floor: {
      holdingDaysDigital: number;
      holdingDaysPhysical: number;
      holdingDaysService: number;
      midtransSettlementDays: number;
      autoForceReleaseDays: number;
    },
  ): StoreSettingsResponseDto {
    const dto = new StoreSettingsResponseDto();
    dto.settlementMode = settings.store.settlementMode.value;
    dto.plan = settings.store.plan.value;
    dto.holdingDaysDigital = floor.holdingDaysDigital;
    dto.holdingDaysPhysical = floor.holdingDaysPhysical;
    dto.holdingDaysService = floor.holdingDaysService;
    dto.midtransSettlementDays = floor.midtransSettlementDays;
    dto.autoForceReleaseDays = floor.autoForceReleaseDays;
    return dto;
  }
}
