import { Store } from '../../../domain/entities/store.aggregate';

export class StoreResponseDto {
  id!: string;
  username!: string;
  displayName!: string;
  bio!: string | null;
  avatarUrl!: string | null;
  bannerUrl!: string | null;
  theme!: Record<string, string> | null;
  plan!: string;
  settlementMode!: string;
  createdAt!: Date;

  static fromDomain(store: Store): StoreResponseDto {
    const dto = new StoreResponseDto();
    dto.id = store.id;
    dto.username = store.username.value;
    dto.displayName = store.profile.displayName;
    dto.bio = store.profile.bio;
    dto.avatarUrl = store.profile.avatarUrl;
    dto.bannerUrl = store.profile.bannerUrl;
    dto.theme = store.theme.value;
    dto.plan = store.plan.value;
    dto.settlementMode = store.settlementMode.value;
    dto.createdAt = store.createdAt;
    return dto;
  }
}
