export const checkoutKeys = {
  all: ['checkout'] as const,
  status: (orderNumber: string) => [...checkoutKeys.all, 'status', orderNumber] as const,
};
