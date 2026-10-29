import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api.client';
import { router } from 'expo-router';
import { ChevronLeft, MapPin, Clock, Star } from 'lucide-react-native';
import { clsx } from 'clsx';

interface RideHistoryItem {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  currencyCode: string;
  status: string;
  createdAt: string;
  driverName?: string;
  rating?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED: { label: 'Complétée', color: '#16a34a', bg: '#f0fdf4' },
  CANCELLED: { label: 'Annulée', color: '#dc2626', bg: '#fef2f2' },
  PAYMENT_CONFIRMED: { label: 'Payée', color: '#4F46E5', bg: '#EEF2FF' },
  NO_DRIVER: { label: 'Sans chauffeur', color: '#d97706', bg: '#fffbeb' },
};

// Mock data for demo
const MOCK_RIDES: RideHistoryItem[] = [
  { id: 'r-001', pickupAddress: 'Tunis Centre', dropoffAddress: 'Lac 1', estimatedFare: 8.50, currencyCode: 'TND', status: 'COMPLETED', createdAt: '2026-10-28T14:32:00Z', driverName: 'Karim T.', rating: 5 },
  { id: 'r-002', pickupAddress: 'Bardo', dropoffAddress: 'La Marsa', estimatedFare: 22.00, currencyCode: 'TND', status: 'COMPLETED', createdAt: '2026-10-27T10:15:00Z', driverName: 'Yassine K.', rating: 4 },
  { id: 'r-003', pickupAddress: 'Ariana', dropoffAddress: 'Menzah 5', estimatedFare: 11.00, currencyCode: 'TND', status: 'CANCELLED', createdAt: '2026-10-26T18:45:00Z' },
  { id: 'r-004', pickupAddress: 'El Manar', dropoffAddress: 'Ennasr', estimatedFare: 7.00, currencyCode: 'TND', status: 'COMPLETED', createdAt: '2026-10-25T08:20:00Z', driverName: 'Mourad A.', rating: 5 },
  { id: 'r-005', pickupAddress: 'Carrefour', dropoffAddress: 'Mégrine', estimatedFare: 14.50, currencyCode: 'TND', status: 'PAYMENT_CONFIRMED', createdAt: '2026-10-24T20:10:00Z', driverName: 'Hatem S.', rating: 3 },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function RideCard({ item }: { item: RideHistoryItem }) {
  const statusConf = STATUS_CONFIG[item.status] || { label: item.status, color: '#64748b', bg: '#f8fafc' };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(client)/ride/${item.id}` as any)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
          <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>

      {/* Route */}
      <View style={styles.routeRow}>
        <View style={styles.routeIcons}>
          <View style={[styles.dot, { backgroundColor: '#4F46E5' }]} />
          <View style={styles.routeDash} />
          <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.routeAddresses}>
          <Text style={styles.address} numberOfLines={1}>{item.pickupAddress}</Text>
          <View style={{ height: 8 }} />
          <Text style={styles.address} numberOfLines={1}>{item.dropoffAddress}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          {item.driverName && (
            <Text style={styles.driverName}>🚗 {item.driverName}</Text>
          )}
          {item.rating && (
            <View style={styles.ratingRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  color={i < item.rating! ? '#f59e0b' : '#e2e8f0'}
                  fill={i < item.rating! ? '#f59e0b' : 'transparent'}
                />
              ))}
            </View>
          )}
        </View>
        <Text style={styles.fare}>{item.estimatedFare.toFixed(2)} {item.currencyCode}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function RideHistoryScreen() {
  const { data: rides = MOCK_RIDES, isLoading } = useQuery({
    queryKey: ['ride-history'],
    queryFn: () =>
      apiClient.get('/rides/history').then((r) => r.data.data as RideHistoryItem[]).catch(() => MOCK_RIDES),
    staleTime: 30_000,
  });

  const completed = rides.filter((r) => r.status === 'COMPLETED' || r.status === 'PAYMENT_CONFIRMED');
  const totalSpent = completed.reduce((sum, r) => sum + r.estimatedFare, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historique des courses</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{rides.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{completed.length}</Text>
          <Text style={styles.statLabel}>Complétées</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{totalSpent.toFixed(2)}</Text>
          <Text style={styles.statLabel}>TND dépensés</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : rides.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🚗</Text>
          <Text style={styles.emptyTitle}>Aucune course</Text>
          <Text style={styles.emptySub}>Vos courses apparaîtront ici</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RideCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },

  statsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: '#fff', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  statDivider: { width: 1, height: 32, backgroundColor: '#f1f5f9' },

  list: { padding: 16 },

  card: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  dateText: { fontSize: 11, color: '#94a3b8' },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  routeIcons: { alignItems: 'center', gap: 2 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  routeDash: { width: 1.5, height: 22, backgroundColor: '#e2e8f0' },
  routeAddresses: { flex: 1 },
  address: { fontSize: 13, fontWeight: '500', color: '#1e293b' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  footerLeft: { gap: 4 },
  driverName: { fontSize: 12, color: '#64748b' },
  ratingRow: { flexDirection: 'row', gap: 2 },
  fare: { fontSize: 16, fontWeight: '800', color: '#1e293b' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  emptySub: { fontSize: 14, color: '#94a3b8' },
});
