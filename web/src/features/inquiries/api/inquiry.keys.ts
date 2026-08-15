import type { ListInquiriesQuery } from './inquiry.api';

export const inquiryKeys = {
  all: ['inquiries'] as const,
  list: (query: ListInquiriesQuery) => [...inquiryKeys.all, 'list', query] as const,
};
