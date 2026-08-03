import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../../../shared/presentation/decorators/roles.decorator';
import { PlatformMetricsService } from '../../application/services/platform-metrics.service';
import { PlatformMetricsResponseDto } from '../dto/responses/platform-metrics-response.dto';

const ADMIN_THROTTLE = { default: { limit: 600, ttl: 60_000 } };

@ApiTags('admin')
@Controller('admin/metrics')
@Roles('admin')
@Throttle(ADMIN_THROTTLE)
export class AdminMetricsController {
  constructor(private readonly metrics: PlatformMetricsService) {}

  @Get()
  async getMetrics(): Promise<PlatformMetricsResponseDto> {
    const metrics = await this.metrics.getMetrics();
    return PlatformMetricsResponseDto.fromMetrics(metrics);
  }
}
