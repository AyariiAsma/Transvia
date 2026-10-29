import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api.client';

export function useVehicleTypes() {
  return useQuery({
    queryKey: ['vehicle-types'],
    queryFn: () =>
      apiClient.get('/rides/vehicle-types').then((r) => r.data.data as Array<{
        id: string;
        name: string;
        displayName: string;
        description?: string;
        emoji?: string;
        order: number;
        isActive: boolean;
      }>),
    staleTime: 5 * 60_000, // 5 minutes
  });
}

export function useActiveRide() {
  return useQuery({
    queryKey: ['active-ride'],
    queryFn: () =>
      apiClient.get('/rides/active').then((r) => r.data.data).catch(() => null),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}
