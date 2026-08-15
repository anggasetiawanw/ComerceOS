export const ORDERING_EVENT_NAMES = {
  ORDER_CREATED: 'ordering.order_created',
  ORDER_PAID: 'ordering.order_paid',
  ORDER_CANCELLED: 'ordering.order_cancelled',
  ORDER_EXPIRED: 'ordering.order_expired',
  ORDER_RELEASED: 'ordering.order_released',
  ORDER_DISPUTED: 'ordering.order_disputed',
  ORDER_REFUNDED: 'ordering.order_refunded',
  INQUIRY_CREATED: 'ordering.inquiry_created',
  INQUIRY_CONVERTED: 'ordering.inquiry_converted',
  INQUIRY_MARKED_LOST: 'ordering.inquiry_marked_lost',
} as const;
