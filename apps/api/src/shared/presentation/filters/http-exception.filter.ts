import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ProblemDetail } from '../dto/problem-detail.dto';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item): item is string => typeof item === 'string');

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      let detail = exception.message;
      let errors: Record<string, string[]> | undefined;

      if (typeof payload === 'string') {
        detail = payload;
      } else if (typeof payload === 'object' && payload !== null) {
        if ('error' in payload && typeof payload.error === 'string') {
          detail = payload.error;
        }
        if ('message' in payload && isStringArray(payload.message)) {
          errors = { _: payload.message };
        }
      }

      const body: ProblemDetail = {
        type: `http/${status}`,
        title: exception.name,
        status,
        detail,
        ...(errors ? { errors } : {}),
      };
      response.status(status).json(body);
      return;
    }

    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(exception, stack);

    const body: ProblemDetail = {
      type: 'internal-error',
      title: 'Internal server error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred',
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
