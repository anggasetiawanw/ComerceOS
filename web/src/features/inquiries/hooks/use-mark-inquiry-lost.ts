import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inquiryApi } from '../api/inquiry.api';
import { inquiryKeys } from '../api/inquiry.keys';

export const useMarkInquiryLost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inquiryApi.markLost,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inquiryKeys.all });
    },
  });
};
