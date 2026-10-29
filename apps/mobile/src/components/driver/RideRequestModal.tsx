import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Vibration,
} from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { MapPin, Navigation, Timer, X, Check } from 'lucide-react-native';

interface RideRequest {
  ride: {
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
    estimatedFare: number;
    currencyCode: string;
    vehicleTypeName?: string;
    serviceType?: string;
  };
  pickupDistanceKm: number;
  estimatedPickupMinutes: number;
  timeoutSeconds: number;
}

interface Props {
  request: RideRequest;
  onAccept: () => void;
  onReject: () => void;
  insets: EdgeInsets;
}

export function RideRequestModal({ request, onAccept, onReject, insets }: Props) {
  const [remaining, setRemaining] = useState(request.timeoutSeconds);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    // Vibration d'alerte
    Vibration.vibrate([0, 300, 200, 300, 200, 300]);

    // Slide in
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, tension: 65, friction: 10,
    }).start();

    // Compte à rebours
    const progress = Animated.timing(progressAnim, {
      toValue: 0,
      duration: request.timeoutSeconds * 1000,
      useNativeDriver: false,
    });
    progress.start();

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      Vibration.cancel();
    };
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const progressColor = progressAnim.interpolate({
    inputRange: [0, 0.33, 1],
    outputRange: ['#ef4444', '#f59e0b', '#10b981'],
  });

  const { ride } = request;

  return (
    <Animated.View style={[styles.container, { paddingBottom: insets.bottom + 8, transform: [{ translateY: slideAnim }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Nouvelle course 🚗</Text>
          <Text style={styles.rideType}>{ride.vehicleTypeName || 'VTC Standard'}</Text>
        </View>
        <View style={styles.timerBadge}>
          <Timer size={14} color="#f59e0b" />
          <Text style={styles.timerText}>{remaining}s</Text>
        </View>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: progressColor }]} />
      </View>

      {/* Distance pickup */}
      <View style={styles.distanceBadge}>
        <Navigation size={13} color="#4F46E5" />
        <Text style={styles.distanceText}>
          {request.pickupDistanceKm.toFixed(1)} km · {request.estimatedPickupMinutes} min jusqu'au client
        </Text>
      </View>

      {/* Trajet */}
      <View style={styles.routeCard}>
        <View style={styles.routePoints}>
          <View style={styles.dotPickup} />
          <View style={styles.routeDash} />
          <View style={styles.dotDropoff} />
        </View>
        <View style={styles.routeTexts}>
          <Text style={styles.routeAddress} numberOfLines={1}>{ride.pickupAddress}</Text>
          <View style={{ height: 10 }} />
          <Text style={styles.routeAddress} numberOfLines={1}>{ride.dropoffAddress}</Text>
        </View>
      </View>

      {/* Tarif estimé */}
      <View style={styles.fareRow}>
        <Text style={styles.fareLabel}>Gain estimé</Text>
        <View style={styles.fareValue}>
          <Text style={styles.fareAmount}>{ride.estimatedFare}</Text>
          <Text style={styles.fareCurrency}> {ride.currencyCode}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
          <X size={22} color="#ef4444" />
          <Text style={styles.rejectText}>Refuser</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
          <Check size={22} color="#fff" />
          <Text style={styles.acceptText}>Accepter</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 24,
  },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {},
  title: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  rideType: { fontSize: 13, color: '#64748b', marginTop: 2 },
  timerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fef3c7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#fde68a',
  },
  timerText: { fontSize: 14, fontWeight: '800', color: '#f59e0b' },

  progressBar: {
    height: 5, backgroundColor: '#f1f5f9', borderRadius: 5, marginBottom: 14, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5 },

  distanceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
    marginBottom: 14, alignSelf: 'flex-start',
  },
  distanceText: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },

  routeCard: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 14,
  },
  routePoints: { alignItems: 'center', gap: 3 },
  dotPickup: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#4F46E5' },
  routeDash: { width: 1.5, height: 20, backgroundColor: '#cbd5e1' },
  dotDropoff: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#10b981' },
  routeTexts: { flex: 1 },
  routeAddress: { fontSize: 13, color: '#1e293b', fontWeight: '500' },

  fareRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f0fdf4', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#bbf7d0',
  },
  fareLabel: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  fareValue: { flexDirection: 'row', alignItems: 'baseline' },
  fareAmount: { fontSize: 22, fontWeight: '800', color: '#15803d' },
  fareCurrency: { fontSize: 14, color: '#16a34a', fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 12 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 15, borderRadius: 16,
    borderWidth: 2, borderColor: '#fca5a5',
  },
  rejectText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: 16,
    backgroundColor: '#10b981',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  acceptText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
