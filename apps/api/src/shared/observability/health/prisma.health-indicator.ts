import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator {
  constructor(private readonly prisma: PrismaService) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { [key]: { status: 'up' } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HealthCheckError('Postgres check failed', {
        [key]: { status: 'down', message },
      });
    }
  }
}
