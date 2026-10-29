import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Linking,
} from 'react-native';
import { Phone, MessageSquare, MapPin, Navigation, CheckCircle2 } from 'lucide-react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { apiClient } from '@/services/api.client';

interface Props {
  ride: any;
  driverLocation: { lat: number; lng: number; eta?: number } | null;
  phase: string;
  insets: EdgeInsets;
}

const phaseConfig: Record<string, { label: string; color: string; emoji: string }> = {
  accepted:         { label: 'Chauffeur en route vers vous', color: '#4F46E5', emoji: '🚗' },
  driver_en_route:  { label: 'Chauffeur en route vers vous', color: '#4F46E5', emoji: '🚗' },
  driver_arrived:   { label: 'Votre chauffeur est arrivé !', color: '#10b981', emoji: '📍' },
  ride_started:     { label: 'Course en cours', color: '#f59e0b', emoji: '🏁' },
};

export function ActiveRideSheet({ ride, driverLocation, phase, insets }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (phase === 'driver_arrived') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [phase]);

  const pc = phaseConfig[phase] || phaseConfig.accepted;

  const callDriver = () => {
    const phone = ride.driver?.user?.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleCancel = async () => {
    try {
      await apiClient.post(`/rides/${ride.id}/cancel`, { reason: 'Annulé par le client' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
      {/* Indicateur de statut */}
      <Animated.View style={[styles.statusBadge, { backgroundColor: pc.color, transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.statusEmoji}>{pc.emoji}</Text>
        <Text style={styles.statusLabel}>{pc.label}</Text>
        {driverLocation?.eta !== undefined && (
          <Text style={styles.statusEta}>· {driverLocation.eta} min</Text>
        )}
      </Animated.View>

      {/* Info chauffeur */}
      <View style={styles.driverCard}>
        <View style={styles.driverAvatar}>
          <Text style={styles.driverAvatarText}>
            {ride.driver?.user?.firstName?.[0] || '?'}{ride.driver?.user?.lastName?.[0] || ''}
          </Text>
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>
            {ride.driver?.user?.firstName} {ride.driver?.user?.lastName}
          </Text>
          <View style={styles.driverMeta}>
            <Text style={styles.driverRating}>★ {ride.driver?.ratingAvg?.toFixed(1) || '–'}</Text>
            <Text style={styles.driverSep}> · </Text>
            <Text style={styles.driverPlate}>{ride.driver?.vehicle?.plateNumber}</Text>
            <Text style={styles.driverSep}> · </Text>
            <Text style={styles.driverCar}>
              {ride.driver?.vehicle?.make} {ride.driver?.vehicle?.model}
            </Text>
          </View>
          <Text style={styles.driverVehicleColor}>
            {ride.driver?.vehicle?.color}
          </Text>
        </View>
        <View style={styles.driverActions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EEF2FF' }]} onPress={callDriver}>
            <Phone size={18} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Trajet */}
      <View style={styles.routeRow}>
        <View style={styles.routePoints}>
          <View style={styles.dotPickup} />
          <View style={styles.routeLine} />
          <View style={styles.dotDropoff} />
        </View>
        <View style={styles.routeAddresses}>
          <Text style={styles.routeAddress} numberOfLines={1}>{ride.pickupAddress}</Text>
          <Text style={styles.routeAddress} numberOfLines={1}>{ride.dropoffAddress}</Text>
        </View>
        <View style={styles.fareContainer}>
          <Text style={styles.fareAmount}>{ride.estimatedFare} {ride.currencyCode}</Text>
          <Text style={styles.fareMethod}>Espèces</Text>
        </View>
      </View>

      {/* Actions */}
      {phase === 'accepted' || phase === 'driver_en_route' ? (
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Annuler la course</Text>
        </TouchableOpacity>
      ) : phase === 'ride_started' ? (
        <View style={styles.rideInProgressNote}>
          <CheckCircle2 size={16} color="#10b981" />
          <Text style={styles.rideInProgressText}>Course en cours — profitez du trajet !</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 16, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
  },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    marginBottom: 16, alignSelf: 'flex-start',
  },
  statusEmoji: { fontSize: 16 },
  statusLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statusEta: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },

  driverCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f8fafc', borderRadius: 16, padding: 12, marginBottom: 14,
  },
  driverAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#4F46E5',
    alignItems: 'center', justifyContent: 'center',
  },
  driverAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  driverMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  driverRating: { fontSize: 12, color: '#f59e0b', fontWeight: '700' },
  driverSep: { fontSize: 12, color: '#cbd5e1' },
  driverPlate: { fontSize: 11, color: '#475569', fontFamily: 'monospace' },
  driverCar: { fontSize: 12, color: '#64748b' },
  driverVehicleColor: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  driverActions: { gap: 8 },
  actionBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  routeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginBottom: 14,
  },
  routePoints: { alignItems: 'center', gap: 2 },
  dotPickup: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4F46E5' },
  routeLine: { width: 1.5, height: 16, backgroundColor: '#cbd5e1' },
  dotDropoff: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981' },
  routeAddresses: { flex: 1 },
  routeAddress: { fontSize: 12, color: '#475569', fontWeight: '500', paddingVertical: 2 },
  fareContainer: { alignItems: 'flex-end' },
  fareAmount: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  fareMethod: { fontSize: 11, color: '#94a3b8' },

  cancelBtn: {
    borderWidth: 1.5, borderColor: '#fca5a5', borderRadius: 14,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },

  rideInProgressNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#bbf7d0',
  },
  rideInProgressText: { color: '#16a34a', fontSize: 13, fontWeight: '500' },
});
