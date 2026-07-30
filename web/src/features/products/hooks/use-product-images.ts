import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../api/product.api';
import { productKeys } from '../api/product.keys';

export const useRemoveProductImage = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageId: string) => productApi.removeImage(productId, imageId),
    onSuccess: (product) => {
      queryClient.setQueryData(productKeys.detail(productId), product);
    },
  });
};
