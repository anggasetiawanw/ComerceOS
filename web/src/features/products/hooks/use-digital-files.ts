import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../api/product.api';
import { productKeys } from '../api/product.keys';

export const useDigitalFiles = (productId: string) =>
  useQuery({
    queryKey: productKeys.files(productId),
    queryFn: () => productApi.listFiles(productId),
    enabled: productId.length > 0,
  });

export const useRemoveDigitalFile = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => productApi.removeFile(productId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.files(productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
  });
};
