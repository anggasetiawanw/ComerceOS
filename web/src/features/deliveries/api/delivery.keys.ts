export const deliveryKeys = {
  all: ['deliveries'] as const,
  list: () => [...deliveryKeys.all, 'list'] as const,
};
