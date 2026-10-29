import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Platform, KeyboardAvoidingView, Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Navigation, Search, ChevronRight, Truck } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useRideStore } from '@/stores/ride.store';
import { getCurrentLocation } from '@/services/location.service';
import { socketService } from '@/services/socket.service';
import { SOCKET_EVENTS, COLORS } from '@/theme/colors';
import { VehicleTypePicker } from '@/components/client/VehicleTypePicker';
import { FareEstimateSheet } from '@/components/client/FareEstimateSheet';
import { ActiveRideSheet } from '@/components/client/ActiveRideSheet';
import { SearchLocationModal } from '@/components/client/SearchLocationModal';
import { useVehicleTypes } from '@/hooks/useVehicleTypes';
import { useActiveRide } from '@/hooks/useActiveRide';

const { width, height } = Dimensions.get('window');
const INITIAL_REGION = {
  latitude: 36.8065,
  longitude: 10.1815,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function ClientHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    phase, pickup, dropoff, fareEstimate, activeRide, driverLocation, estimatedRoute,
    setPhase, setPickup, setDropoff, reset,
  } = useRideStore();

  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [searchTarget, setSearchTarget] = useState<'pickup' | 'dropoff'>('pickup');

  const slideAnim = useRef(new Animated.Value(0)).current;

  const { data: vehicleTypes } = useVehicleTypes();
  const { data: activeRideData } = useActiveRide();

  // Initialisation: position + socket
  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) {
        setUserLocation(loc);
        mapRef.current?.animateToRegion({
          latitude: loc.lat,
          longitude: loc.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
        // Pré-remplir le pickup avec la position actuelle
        if (!pickup) {
          setPickup({ lat: loc.lat, lng: loc.lng, address: 'Ma position' });
        }
      }
    })();

    // Connecter le socket
    socketService.connect('client');

    // Écouter les événements de course
    const unsubAccepted = socketService.on(SOCKET_EVENTS.RIDE_ACCEPTED, (data: any) => {
      useRideStore.getState().setPhase('accepted');
      useRideStore.getState().setActiveRide(data.ride);
    });

    const unsubCancelled = socketService.on(SOCKET_EVENTS.RIDE_CANCELLED, () => {
      reset();
    });

    const unsubDriverLoc = socketService.on(SOCKET_EVENTS.RIDE_DRIVER_LOCATION, (data: any) => {
      useRideStore.getState().updateDriverLocation(data);
    });

    return () => {
      unsubAccepted();
      unsubCancelled();
      unsubDriverLoc();
    };
  }, []);

  // Animer le bottom sheet
  useEffect(() => {
    const shouldShow = phase !== 'idle';
    Animated.spring(slideAnim, {
      toValue: shouldShow ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [phase]);

  const openSearch = useCallback((target: 'pickup' | 'dropoff') => {
    setSearchTarget(target);
    setShowLocationSearch(true);
  }, []);

  const handleLocationSelected = useCallback(
    (loc: { lat: number; lng: number; address: string; placeId?: string }) => {
      if (searchTarget === 'pickup') {
        setPickup(loc);
        if (dropoff) setPhase('estimating');
      } else {
        setDropoff(loc);
        setPhase('estimating');
      }
      setShowLocationSearch(false);
    },
    [searchTarget, dropoff],
  );

  const isActiveRide = ['accepted', 'driver_en_route', 'driver_arrived', 'ride_started'].includes(phase);

  return (
    <View style={styles.container}>
      {/* ─── Map ─────────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        mapPadding={{ top: 0, right: 0, bottom: 280, left: 0 }}
      >
        {/* Marker Pickup */}
        {pickup && (
          <Marker
            coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.pickupMarker}>
              <MapPin size={20} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Marker Dropoff */}
        {dropoff && (
          <Marker
            coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.dropoffMarker}>
              <Navigation size={18} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Marker Driver */}
        {driverLocation && (
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.driverMarker}>
              <Truck size={16} color="#4F46E5" />
            </View>
          </Marker>
        )}

        {/* Route polyline */}
        {estimatedRoute?.polyline && (
          <Polyline
            coordinates={decodePolyline(estimatedRoute.polyline)}
            strokeColor="#4F46E5"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} pointerEvents="box-none">
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>
                Bonjour, {user?.firstName} 👋
              </Text>
              <Text style={styles.subGreeting}>Où allez-vous ?</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* ─── Bottom Sheet ────────────────────────────────────────────────────── */}
      {!isActiveRide && phase !== 'searching' && (
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom }]}>
          {/* Barre de recherche rapide */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => openSearch('dropoff')}
            activeOpacity={0.85}
          >
            <View style={styles.searchDots}>
              <View style={styles.dotPickup} />
              <View style={styles.dotLine} />
              <View style={styles.dotDropoff} />
            </View>
            <View style={styles.searchTexts}>
              <TouchableOpacity onPress={() => openSearch('pickup')}>
                <Text
                  style={[styles.searchText, !pickup && styles.searchPlaceholder]}
                  numberOfLines={1}
                >
                  {pickup?.address || 'Point de départ'}
                </Text>
              </TouchableOpacity>
              <View style={styles.searchDivider} />
              <Text
                style={[styles.searchText, !dropoff && styles.searchPlaceholder]}
                numberOfLines={1}
              >
                {dropoff?.address || 'Destination'}
              </Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Services rapides */}
          {phase === 'idle' && (
            <View style={styles.quickServices}>
              {[
                { icon: '🚗', label: 'VTC', action: () => openSearch('dropoff') },
                { icon: '📦', label: 'Livraison', action: () => {} },
                { icon: '📅', label: 'Planifier', action: () => {} },
              ].map((s) => (
                <TouchableOpacity key={s.label} style={styles.serviceBtn} onPress={s.action}>
                  <Text style={styles.serviceIcon}>{s.icon}</Text>
                  <Text style={styles.serviceLabel}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Sélecteur de véhicule + estimation */}
          {(phase === 'estimating' || phase === 'confirming') && pickup && dropoff && (
            <FareEstimateSheet
              pickup={pickup}
              dropoff={dropoff}
              vehicleTypes={vehicleTypes || []}
              onConfirm={() => setPhase('searching')}
              onCancel={reset}
            />
          )}
        </View>
      )}

      {/* ─── Searching overlay ───────────────────────────────────────────────── */}
      {phase === 'searching' && (
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.searchingContainer}>
            <Animated.View style={styles.searchingPulse}>
              <Text style={styles.searchingEmoji}>🔍</Text>
            </Animated.View>
            <Text style={styles.searchingTitle}>Recherche d'un chauffeur...</Text>
            <Text style={styles.searchingSubtitle}>Nous cherchons le chauffeur le plus proche</Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={reset}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Active Ride Sheet ───────────────────────────────────────────────── */}
      {isActiveRide && activeRide && (
        <ActiveRideSheet
          ride={activeRide}
          driverLocation={driverLocation}
          phase={phase}
          insets={insets}
        />
      )}

      {/* ─── Location Search Modal ───────────────────────────────────────────── */}
      <SearchLocationModal
        visible={showLocationSearch}
        target={searchTarget}
        currentLat={userLocation?.lat}
        currentLng={userLocation?.lng}
        onSelect={handleLocationSelected}
        onClose={() => setShowLocationSearch(false)}
      />
    </View>
  );
}

// Décoder un polyline encodé Google
function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: { paddingHorizontal: 20, paddingTop: 8 },
  headerContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
  },
  greeting: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  subGreeting: { fontSize: 13, color: '#64748b', marginTop: 2 },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 16, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 16,
  },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchDots: { alignItems: 'center', gap: 2 },
  dotPickup: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4F46E5' },
  dotLine: { width: 1.5, height: 14, backgroundColor: '#cbd5e1' },
  dotDropoff: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981' },
  searchTexts: { flex: 1 },
  searchText: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  searchPlaceholder: { color: '#94a3b8', fontWeight: '400' },
  searchDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },

  quickServices: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 8 },
  serviceBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    backgroundColor: '#f8fafc', borderRadius: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  serviceIcon: { fontSize: 24 },
  serviceLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 6 },

  searchingContainer: { alignItems: 'center', paddingVertical: 24 },
  searchingPulse: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  searchingEmoji: { fontSize: 32 },
  searchingTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  searchingSubtitle: { fontSize: 13, color: '#64748b', marginTop: 6, textAlign: 'center' },
  cancelBtn: {
    marginTop: 20, paddingVertical: 12, paddingHorizontal: 32,
    borderRadius: 50, borderWidth: 1.5, borderColor: '#ef4444',
  },
  cancelBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },

  pickupMarker: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#4F46E5',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 6,
  },
  dropoffMarker: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#10b981',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 6,
  },
  driverMarker: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#4F46E5',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4,
  },
});
