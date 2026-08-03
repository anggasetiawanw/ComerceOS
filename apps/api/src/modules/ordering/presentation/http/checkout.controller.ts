import { Body, Controller, Get, HttpCode, HttpStatus, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { Idempotent } from '../../../../shared/infrastructure/idempotency/idempotent.decorator';
import { USER_REPOSITORY, UserRepository } from '../../../identity/domain/repositories/user.repository';
import { CheckoutService } from '../../application/services/checkout.service';
import { OrderReadService } from '../../application/services/order-read.service';
import { CheckoutQuoteDto } from '../dto/requests/checkout-quote.dto';
import { CheckoutQuoteResponseDto } from '../dto/responses/checkout-quote-response.dto';
import { CheckoutCreateResponseDto } from '../dto/responses/checkout-create-response.dto';
import { OrderResponseDto } from '../dto/responses/order-response.dto';

const CHECKOUT_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly checkout: CheckoutService,
    private readonly orderRead: OrderReadService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  @Post('quote')
  async quote(@Body() dto: CheckoutQuoteDto): Promise<CheckoutQuoteResponseDto> {
    const result = await this.checkout.quote(dto.items);
    return CheckoutQuoteResponseDto.fromResult(unwrapOrThrow(result));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle(CHECKOUT_THROTTLE)
  @Idempotent()
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CheckoutQuoteDto,
  ): Promise<CheckoutCreateResponseDto> {
    const buyer = await this.users.findById(user.id);
    if (!buyer) throw new NotFoundException('User not found');

    const result = await this.checkout.create(user.id, {
      items: dto.items,
      buyerName: buyer.name,
      buyerEmail: buyer.email.value,
      buyerPhone: buyer.phone,
    });
    return CheckoutCreateResponseDto.fromResult(unwrapOrThrow(result));
  }

  @Get(':orderNumber/status')
  async status(
    @CurrentUser() user: CurrentUserPayload,
    @Param('orderNumber') orderNumber: string,
  ): Promise<OrderResponseDto> {
    const result = await this.orderRead.getByOrderNumberForBuyer(user.id, orderNumber);
    return OrderResponseDto.fromDomain(unwrapOrThrow(result));
  }
}
