import { Body, Controller, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../../shared/presentation/decorators/public.decorator';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { RequestWithUser } from '../../../../shared/presentation/guards/jwt-auth.guard';
import { CreateInquiryService } from '../../application/services/create-inquiry.service';
import { CreateInquiryDto } from '../dto/requests/create-inquiry.dto';
import { CreateInquiryResponseDto } from '../dto/responses/create-inquiry-response.dto';

const PUBLIC_STOREFRONT_THROTTLE = { default: { limit: 120, ttl: 60_000 } };

// Lives in ordering (the owning context) rather than storefront, on the
// same public /storefront/:username path storefront's own read endpoints
// use — a route's URL is independent of which module serves it. Bolting
// this onto StorefrontModule would have pulled ordering's entire write-side
// dependency graph (identity, payments, audit, notifications) into what is
// otherwise a deliberately lean, cache-optimized read module.
@ApiTags('storefront')
@Controller('storefront')
@Public()
@Throttle(PUBLIC_STOREFRONT_THROTTLE)
export class PublicInquiriesController {
  constructor(private readonly createInquiry: CreateInquiryService) {}

  @Post(':username/inquiries')
  @HttpCode(HttpStatus.CREATED)
  async createInquiryForStore(
    @Param('username') username: string,
    @Body() dto: CreateInquiryDto,
    @Req() req: Request,
  ): Promise<CreateInquiryResponseDto> {
    const user = (req as RequestWithUser).user;
    const dedupToken = user?.id ?? req.ip ?? 'unknown';

    const result = await this.createInquiry.execute({
      username,
      productId: dto.productId ?? null,
      buyerId: user?.id ?? null,
      dedupToken,
    });
    return CreateInquiryResponseDto.fromResult(unwrapOrThrow(result));
  }
}
