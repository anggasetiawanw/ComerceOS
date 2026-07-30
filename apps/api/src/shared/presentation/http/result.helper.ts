import { BadRequestException } from '@nestjs/common';
import { DomainError } from '../../domain-errors/domain.error';
import { Result } from '../../kernel/result';

export const unwrapOrThrow = <T, E extends Error>(result: Result<T, E>): T => {
  if (result.isOk()) {
    return result.unwrap();
  }
  const error = result.unwrapErr();
  if (error instanceof DomainError) {
    throw error;
  }
  throw new BadRequestException(error.message);
};
