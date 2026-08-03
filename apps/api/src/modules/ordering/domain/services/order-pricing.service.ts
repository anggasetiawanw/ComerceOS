import { Result } from '../../../../shared/kernel/result';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { DiscountApplication } from '../value-objects/discount-application.vo';
import { PlatformFee } from '../value-objects/platform-fee.vo';
import { InvalidOrderError } from '../errors/ordering.errors';

export interface PricingLine {
  price: Money;
  qty: number;
}

export interface PricingResult {
  subtotal: Money;
  discount: DiscountApplication;
  total: Money;
  fee: PlatformFee;
}

// Composition order is fixed: subtotal -> discount (clamped at subtotal,
// never negative) -> total -> platform fee (.docs/03-bounded-contexts.md §3.4).
// Fee rounding is half-up, favoring the platform — Money.percentageBasisPoints.
export class OrderPricingService {
  price(params: {
    items: readonly PricingLine[];
    discountCode?: string | null;
    discountAmount?: Money;
    feeRateBasisPoints: number;
  }): Result<PricingResult, InvalidOrderError> {
    let subtotal = Money.zero();
    for (const item of params.items) {
      const lineResult = item.price.multiply(item.qty);
      if (lineResult.isErr()) {
        return Result.err(new InvalidOrderError(lineResult.unwrapErr().message));
      }
      subtotal = subtotal.add(lineResult.unwrap());
    }

    const requestedDiscount = params.discountAmount ?? Money.zero();
    const clampedDiscount = requestedDiscount.min(subtotal);
    const discount =
      params.discountCode && !clampedDiscount.isZero()
        ? DiscountApplication.of(params.discountCode, clampedDiscount)
        : DiscountApplication.none();

    const totalResult = subtotal.subtract(discount.amount);
    if (totalResult.isErr()) {
      return Result.err(new InvalidOrderError(totalResult.unwrapErr().message));
    }
    const total = totalResult.unwrap();

    const feeAmountResult = total.percentageBasisPoints(params.feeRateBasisPoints);
    if (feeAmountResult.isErr()) {
      return Result.err(new InvalidOrderError(feeAmountResult.unwrapErr().message));
    }

    const feeResult = PlatformFee.create(params.feeRateBasisPoints, feeAmountResult.unwrap());
    if (feeResult.isErr()) {
      return Result.err(new InvalidOrderError(feeResult.unwrapErr().message));
    }

    return Result.ok({ subtotal, discount, total, fee: feeResult.unwrap() });
  }
}
