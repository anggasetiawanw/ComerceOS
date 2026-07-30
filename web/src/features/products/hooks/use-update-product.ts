import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi, type UpdateProductInput } from '../api/product.api';
import { productKeys } from '../api/product.keys';

export const useUpdateProduct = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProductInput) => productApi.update(id, input),
    onSuccess: (product) => {
      queryClient.setQueryData(productKeys.detail(id), product);
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};
