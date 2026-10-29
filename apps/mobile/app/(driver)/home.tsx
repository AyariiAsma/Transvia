import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Platform, StatusBar,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Switch } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/services/api.client';
import { socketService } from '@/services/socket.service';
import { startBackgroundLocation, stopBackgroundLocation, getCurrentLocation } from '@/services/location.service';
import { SOCKET_EVENTS } from '@logistic/shared';
import { RideRequestModal } from '@/components/driver/RideRequestModal';
import { ActiveRideDriver } from '@/components/driver/ActiveRideDriver';
import { EarningsSummary } from '@/components/driver/EarningsSummary';
import { Wifi, WifiOff, Star, TrendingUp } from 'lucide-react-native';

type DriverPhase = 'offline' | 'online_idle' | 'ride_request' | 'active_ride';

interface PendingRideRequest {
  ride: any;
  pickupDistanceKm: number;
  estimatedPickupMinutes: number;
  timeoutSeconds: number;
}

export default function DriverHomeScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const mapRef = useRef<MapView>(null);
  const [phase, setPhase] = useState<DriverPhase>('offline');
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PendingRideRequest | null>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [earnings, setEarnings] = useState({ today: 0, rides: 0 });

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Charger la position initiale
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) setLocation(loc);
    })();

    // Connecter le socket
    socketService.connect('driver');

    // Écouter les demandes de course
    const unsubRequest = socketService.on(SOCKET_EVENTS.RIDE_NEW_REQUEST, (data: any) => {
      setPendingRequest(data);
      setPhase('ride_request');
      startPulse();
    });

    const unsubCancelled = socketService.on(SOCKET_EVENTS.RIDE_CANCELLED, () => {
      setPendingRequest(null);
      setActiveRide(null);
      setPhase(isOnline ? 'online_idle' : 'offline');
    });

    const unsubTimeout = socketService.on(SOCKET_EVENTS.RIDE_REQUEST_TIMEOUT, () => {
      setPendingRequest(null);
      setPhase(isOnline ? 'online_idle' : 'offline');
    });

    return () => {
      unsubRequest();
      unsubCancelled();
      unsubTimeout();
    };
  }, [isOnline]);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      { iterations: 10 },
    ).start();
  };

  const toggleOnline = async (value: boolean) => {
    const currentLoc = await getCurrentLocation();
    if (!currentLoc && value) return;

    try {
      await apiClient.patch('/driver/status', {
        isOnline: value,
        lat: currentLoc?.lat,
        lng: currentLoc?.lng,
      });

      setIsOnline(value);
      setPhase(value ? 'online_idle' : 'offline');

      if (value) {
        await startBackgroundLocation();
      } else {
        await stopBackgroundLocation();
      }
    } catch (err) {
      console.error('Toggle online error:', err);
    }
  };

  const handleAcceptRide = async () => {
    if (!pendingRequest) return;
    try {
      const res = await apiClient.post(`/driver/rides/${pendingRequest.ride.id}/accept`);
      setActiveRide(res.data.data);
      setPendingRequest(null);
      setPhase('active_ride');
    } catch (err) {
      console.error('Accept ride error:', err);
    }
  };

  const handleRejectRide = async () => {
    if (!pendingRequest) return;
    await apiClient.post(`/driver/rides/${pendingRequest.ride.id}/reject`);
    setPendingRequest(null);
    setPhase('online_idle');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={
          location
            ? { latitude: location.lat, longitude: location.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }
            : { latitude: 36.8065, longitude: 10.1815, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
        showsUserLocation
        showsMyLocationButton={false}
        mapPadding={{ top: 0, right: 0, bottom: 200, left: 0 }}
      />

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.driverInfo}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10b981' : '#94a3b8' }]} />
            <View>
              <Text style={styles.driverName}>{user?.firstName} {user?.lastName}</Text>
              <Text style={styles.driverStatus}>{isOnline ? '🟢 En ligne' : '⚫ Hors ligne'}</Text>
            </View>
          </View>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>{isOnline ? 'EN LIGNE' : 'HORS LIGNE'}</Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: '#e2e8f0', true: '#4F46E5' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Stats du jour */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <TrendingUp size={14} color="#10b981" />
            <Text style={styles.statValue}>{earnings.today.toFixed(2)} TND</Text>
            <Text style={styles.statLabel}>Aujourd'hui</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{earnings.rides}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Star size={12} color="#f59e0b" />
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Note</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Idle State */}
      {phase === 'online_idle' && (
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.idleContainer}>
            <Animated.View style={[styles.radarPulse, { transform: [{ scale: pulseAnim }] }]}>
              <Wifi size={24} color="#4F46E5" />
            </Animated.View>
            <Text style={styles.idleTitle}>En attente de courses...</Text>
            <Text style={styles.idleSub}>Vous recevrez une notification pour chaque demande</Text>
          </View>
        </View>
      )}

      {/* Offline State */}
      {phase === 'offline' && (
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.offlineContainer}>
            <WifiOff size={28} color="#94a3b8" />
            <Text style={styles.offlineTitle}>Vous êtes hors ligne</Text>
            <Text style={styles.offlineSub}>Activez le switch pour recevoir des courses</Text>
          </View>
        </View>
      )}

      {/* Ride Request Modal */}
      {phase === 'ride_request' && pendingRequest && (
        <RideRequestModal
          request={pendingRequest}
          onAccept={handleAcceptRide}
          onReject={handleRejectRide}
          insets={insets}
        />
      )}

      {/* Active Ride */}
      {phase === 'active_ride' && activeRide && (
        <ActiveRideDriver
          ride={activeRide}
          insets={insets}
          onStatusUpdate={(status) => {
            if (status === 'PAYMENT_CONFIRMED') {
              setActiveRide(null);
              setPhase('online_idle');
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
    marginTop: 8,
  },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  driverName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  driverStatus: { fontSize: 12, color: '#64748b', marginTop: 1 },
  toggleContainer: { alignItems: 'flex-end', gap: 2 },
  toggleLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16, padding: 12, marginTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  statLabel: { fontSize: 10, color: '#64748b' },
  statDivider: { width: 1, height: 32, backgroundColor: '#e2e8f0' },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 16,
  },
  idleContainer: { alignItems: 'center', paddingVertical: 24 },
  radarPulse: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  idleTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  idleSub: { fontSize: 13, color: '#64748b', marginTop: 6, textAlign: 'center' },

  offlineContainer: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  offlineTitle: { fontSize: 16, fontWeight: '600', color: '#475569' },
  offlineSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
