import { UsernameAvailability } from '../../../domain/services/username-availability.service';

export class UsernameAvailabilityResponseDto {
  available!: boolean;
  reason?: 'reserved' | 'taken';

  static fromDomain(availability: UsernameAvailability): UsernameAvailabilityResponseDto {
    const dto = new UsernameAvailabilityResponseDto();
    dto.available = availability.available;
    dto.reason = availability.reason;
    return dto;
  }
}
