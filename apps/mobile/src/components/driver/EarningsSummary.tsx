import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api.client';
import { TrendingUp, Car, Star, Clock } from 'lucide-react-native';

export function EarningsSummary() {
  const { data: earnings } = useQuery({
    queryKey: ['driver-earnings'],
    queryFn: () => apiClient.get('/driver/earnings').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const stats = [
    { label: "Aujourd'hui", value: `${earnings?.today?.toFixed(2) ?? '0.00'} TND`, icon: TrendingUp, color: '#10b981' },
    { label: 'Cette semaine', value: `${earnings?.week?.toFixed(2) ?? '0.00'} TND`, icon: TrendingUp, color: '#4F46E5' },
    { label: 'Courses', value: String(earnings?.totalRides ?? 0), icon: Car, color: '#f59e0b' },
    { label: 'Note', value: `${earnings?.rating?.toFixed(1) ?? '–'}`, icon: Star, color: '#f59e0b' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes Gains</Text>
      <View style={styles.grid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: `${s.color}20` }]}>
              <s.icon size={16} color={s.color} />
            </View>
            <Text style={styles.value}>{s.value}</Text>
            <Text style={styles.label}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    flex: 1, minWidth: '45%',
    backgroundColor: '#f8fafc', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  value: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  label: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '500' },
});
