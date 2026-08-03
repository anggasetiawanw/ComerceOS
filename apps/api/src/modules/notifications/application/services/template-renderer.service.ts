import { Injectable } from '@nestjs/common';
import { RenderedMessage } from '../ports/notification-channel.port';
import { NOTIFICATION_TEMPLATES } from '../../domain/value-objects/notification-templates';
import { isInvoiceReadyPayload, renderInvoiceReady } from '../../infrastructure/templates/invoice-ready.template';
import { isOrderReleasedPayload, renderOrderReleased } from '../../infrastructure/templates/order-released.template';

export class UnknownNotificationTemplateError extends Error {
  constructor(template: string) {
    super(`Unknown or malformed notification template "${template}"`);
  }
}

@Injectable()
export class TemplateRenderer {
  render(template: string, payload: Record<string, unknown>): RenderedMessage {
    if (template === NOTIFICATION_TEMPLATES.INVOICE_READY && isInvoiceReadyPayload(payload)) {
      return renderInvoiceReady(payload);
    }
    if (template === NOTIFICATION_TEMPLATES.ORDER_RELEASED && isOrderReleasedPayload(payload)) {
      return renderOrderReleased(payload);
    }
    throw new UnknownNotificationTemplateError(template);
  }
}
