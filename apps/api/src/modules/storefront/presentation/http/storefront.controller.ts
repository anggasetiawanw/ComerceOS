import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../../shared/presentation/decorators/public.decorator';
import { StorefrontService } from '../../application/services/storefront.service';
import { StorefrontResponseDto } from '../dto/responses/storefront-response.dto';

const PUBLIC_STOREFRONT_THROTTLE = { default: { limit: 120, ttl: 60_000 } };

@ApiTags('storefront')
@Controller('storefront')
@Public()
@Throttle(PUBLIC_STOREFRONT_THROTTLE)
export class StorefrontController {
  constructor(private readonly storefront: StorefrontService) {}

  @Get(':username')
  async getByUsername(@Param('username') username: string): Promise<StorefrontResponseDto> {
    const result = await this.storefront.getByUsername(username);
    if (!result) {
      throw new NotFoundException('Store not found');
    }
    return StorefrontResponseDto.fromResult(result);
  }
}
