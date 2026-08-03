import { apiClient } from '@/lib/api/client';
import type { BuyerDelivery, DownloadUrlResult } from '../types/delivery.types';

export const deliveryApi = {
  list: (): Promise<BuyerDelivery[]> => apiClient.get<BuyerDelivery[]>('/me/deliveries'),
  download: (id: string): Promise<DownloadUrlResult> => apiClient.post<DownloadUrlResult>(`/me/deliveries/${id}/download`),
};
