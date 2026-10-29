import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { apiClient } from '@/services/api.client';
import { Phone, CheckCircle, Flag, Navigation } from 'lucide-react-native';

interface Props {
  ride: any;
  insets: EdgeInsets;
  onStatusUpdate: (status: string) => void;
}

type DriverRidePhase = 'ACCEPTED' | 'DRIVER_EN_ROUTE' | 'DRIVER_ARRIVED' | 'RIDE_STARTED' | 'PAYMENT_CONFIRMED';

const phaseActions: Record<DriverRidePhase, {
  label: string; nextStatus: string; color: string; icon: React.ElementType;
}> = {
  ACCEPTED: {
    label: 'Je suis en route →',
    nextStatus: 'DRIVER_ARRIVED',
    color: '#4F46E5',
    icon: Navigation,
  },
  DRIVER_EN_ROUTE: {
    label: 'Je suis arrivé →',
    nextStatus: 'DRIVER_ARRIVED',
    color: '#f59e0b',
    icon: CheckCircle,
  },
  DRIVER_ARRIVED: {
    label: 'Démarrer la course →',
    nextStatus: 'RIDE_STARTED',
    color: '#10b981',
    icon: Flag,
  },
  RIDE_STARTED: {
    label: 'Terminer la course →',
    nextStatus: 'PAYMENT_CONFIRMED',
    color: '#ef4444',
    icon: CheckCircle,
  },
  PAYMENT_CONFIRMED: {
    label: 'Course terminée ✅',
    nextStatus: '',
    color: '#94a3b8',
    icon: CheckCircle,
  },
};

const apiEndpoints: Record<string, string> = {
  DRIVER_EN_ROUTE: 'en-route',
  DRIVER_ARRIVED: 'arrived',
  RIDE_STARTED: 'start',
  PAYMENT_CONFIRMED: 'complete',
};

export function ActiveRideDriver({ ride, insets, onStatusUpdate }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const currentPhase = (ride.status as DriverRidePhase) || 'ACCEPTED';
  const action = phaseActions[currentPhase] || phaseActions.ACCEPTED;

  const handleAction = async () => {
    setIsLoading(true);
    try {
      const endpoint = apiEndpoints[action.nextStatus] || 'complete';
      await apiClient.post(`/driver/rides/${ride.id}/${endpoint}`);
      onStatusUpdate(action.nextStatus);
    } catch (err) {
      console.error('Ride action error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const callClient = () => {
    const phone = ride.client?.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const navigateToPickup = () => {
    const { pickupLat, pickupLng } = ride;
    if (pickupLat && pickupLng) {
      Linking.openURL(`https://maps.google.com/?daddr=${pickupLat},${pickupLng}`);
    }
  };

  const navigateToDropoff = () => {
    const { dropoffLat, dropoffLng } = ride;
    if (dropoffLat && dropoffLng) {
      Linking.openURL(`https://maps.google.com/?daddr=${dropoffLat},${dropoffLng}`);
    }
  };

  const isPickupPhase = ['ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED'].includes(currentPhase);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {/* Client info */}
      <View style={styles.clientCard}>
        <View style={styles.clientAvatar}>
          <Text style={styles.clientAvatarText}>
            {ride.client?.firstName?.[0]}{ride.client?.lastName?.[0]}
          </Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>
            {ride.client?.firstName} {ride.client?.lastName}
          </Text>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Montant : </Text>
            <Text style={styles.fareAmount}>{ride.estimatedFare} {ride.currencyCode}</Text>
            <Text style={styles.paymentMethod}> · Espèces</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.callBtn} onPress={callClient}>
          <Phone size={18} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* Navigation rapide */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, !isPickupPhase && styles.navBtnDisabled]}
          onPress={navigateToPickup}
          disabled={!isPickupPhase}
        >
          <Text style={styles.navBtnText}>📍 Navigation prise en charge</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, isPickupPhase && styles.navBtnDisabled]}
          onPress={navigateToDropoff}
          disabled={isPickupPhase}
        >
          <Text style={styles.navBtnText}>🏁 Navigation destination</Text>
        </TouchableOpacity>
      </View>

      {/* Adresses */}
      <View style={styles.routeCard}>
        <View style={styles.routePoints}>
          <View style={[styles.dot, { backgroundColor: '#4F46E5' }]} />
          <View style={styles.routeLine} />
          <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.routeTexts}>
          <Text style={styles.routeAddress} numberOfLines={1}>{ride.pickupAddress}</Text>
          <View style={{ height: 10 }} />
          <Text style={styles.routeAddress} numberOfLines={1}>{ride.dropoffAddress}</Text>
        </View>
      </View>

      {/* Action principale */}
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: action.color }, isLoading && styles.btnDisabled]}
        onPress={handleAction}
        disabled={isLoading || currentPhase === 'PAYMENT_CONFIRMED'}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <action.icon size={18} color="#fff" />
            <Text style={styles.actionBtnText}>{action.label}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },

  clientCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f8fafc', borderRadius: 16, padding: 12, marginBottom: 12,
  },
  clientAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center',
  },
  clientAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  fareRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  fareLabel: { fontSize: 12, color: '#64748b' },
  fareAmount: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  paymentMethod: { fontSize: 11, color: '#94a3b8' },
  callBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },

  navRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  navBtn: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 8,
    backgroundColor: '#EEF2FF', borderRadius: 12, alignItems: 'center',
  },
  navBtnDisabled: { backgroundColor: '#f1f5f9', opacity: 0.5 },
  navBtnText: { fontSize: 11, color: '#4F46E5', fontWeight: '600', textAlign: 'center' },

  routeCard: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginBottom: 14,
  },
  routePoints: { alignItems: 'center', gap: 3 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 1.5, height: 18, backgroundColor: '#cbd5e1' },
  routeTexts: { flex: 1 },
  routeAddress: { fontSize: 13, color: '#1e293b', fontWeight: '500' },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnDisabled: { opacity: 0.55 },
});
