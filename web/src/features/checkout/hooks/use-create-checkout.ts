import { useMutation } from '@tanstack/react-query';
import { checkoutApi } from '../api/checkout.api';

export const useCreateCheckout = () =>
  useMutation({
    mutationFn: checkoutApi.create,
  });
