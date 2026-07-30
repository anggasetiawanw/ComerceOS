import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '../api/store.api';
import { storeKeys } from '../api/store.keys';

export const useSocialLinks = () =>
  useQuery({
    queryKey: storeKeys.socialLinks(),
    queryFn: storeApi.listSocialLinks,
  });

export const useAddSocialLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storeApi.addSocialLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storeKeys.socialLinks() }),
  });
};

export const useUpdateSocialLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; platform?: string; url?: string }) =>
      storeApi.updateSocialLink(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storeKeys.socialLinks() }),
  });
};

export const useRemoveSocialLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storeApi.removeSocialLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storeKeys.socialLinks() }),
  });
};

export const useReorderSocialLinks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storeApi.reorderSocialLinks,
    onSuccess: (links) => queryClient.setQueryData(storeKeys.socialLinks(), links),
  });
};
