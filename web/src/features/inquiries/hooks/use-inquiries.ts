import { useQuery } from '@tanstack/react-query';
import { inquiryApi, type ListInquiriesQuery } from '../api/inquiry.api';
import { inquiryKeys } from '../api/inquiry.keys';

export const useInquiries = (query: ListInquiriesQuery = {}) =>
  useQuery({
    queryKey: inquiryKeys.list(query),
    queryFn: () => inquiryApi.list(query),
  });
