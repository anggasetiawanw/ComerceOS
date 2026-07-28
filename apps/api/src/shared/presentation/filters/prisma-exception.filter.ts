import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import { ProblemDetail } from '../dto/problem-detail.dto';

const KNOWN_CODE_STATUS: Record<string, number> = {
  P2002: 409,
  P2025: 404,
  P2003: 409,
};

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const code = 'code' in exception ? exception.code : 'PRISMA_VALIDATION_ERROR';
    const status = KNOWN_CODE_STATUS[code] ?? 500;

    this.logger.error({ code, message: exception.message }, 'Prisma error');

    const body: ProblemDetail = {
      type: `prisma/${code.toLowerCase()}`,
      title: 'Database error',
      status,
      detail: status === 500 ? 'An unexpected database error occurred' : exception.message,
    };
    response.status(status).json(body);
  }
}
