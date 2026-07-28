import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../../domain-errors/domain.error';
import { ProblemDetail } from '../dto/problem-detail.dto';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    this.logger.warn({ code: exception.code, message: exception.message }, 'Domain error');

    const body: ProblemDetail = {
      type: exception.code,
      title: exception.name,
      status: exception.status,
      detail: exception.message,
    };
    response.status(exception.status).json(body);
  }
}
