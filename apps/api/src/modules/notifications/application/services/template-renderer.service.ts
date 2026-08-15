import { Injectable } from '@nestjs/common';
import { RenderedMessage } from '../ports/notification-channel.port';
import { NOTIFICATION_TEMPLATES } from '../../domain/value-objects/notification-templates';
import { isInvoiceReadyPayload, renderInvoiceReady } from '../../infrastructure/templates/invoice-ready.template';
import { isOrderReleasedPayload, renderOrderReleased } from '../../infrastructure/templates/order-released.template';
import {
  isWithdrawalRequestedPayload,
  renderWithdrawalRequested,
} from '../../infrastructure/templates/withdrawal-requested.template';
import { isWithdrawalPaidPayload, renderWithdrawalPaid } from '../../infrastructure/templates/withdrawal-paid.template';
import {
  isWithdrawalRejectedPayload,
  renderWithdrawalRejected,
} from '../../infrastructure/templates/withdrawal-rejected.template';
import { isInquiryReceivedPayload, renderInquiryReceived } from '../../infrastructure/templates/inquiry-received.template';

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
    if (template === NOTIFICATION_TEMPLATES.WITHDRAWAL_REQUESTED && isWithdrawalRequestedPayload(payload)) {
      return renderWithdrawalRequested(payload);
    }
    if (template === NOTIFICATION_TEMPLATES.WITHDRAWAL_PAID && isWithdrawalPaidPayload(payload)) {
      return renderWithdrawalPaid(payload);
    }
    if (template === NOTIFICATION_TEMPLATES.WITHDRAWAL_REJECTED && isWithdrawalRejectedPayload(payload)) {
      return renderWithdrawalRejected(payload);
    }
    if (template === NOTIFICATION_TEMPLATES.INQUIRY_RECEIVED && isInquiryReceivedPayload(payload)) {
      return renderInquiryReceived(payload);
    }
    throw new UnknownNotificationTemplateError(template);
  }
}
