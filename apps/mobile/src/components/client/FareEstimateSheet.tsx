import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api.client';
import { useRideStore } from '@/stores/ride.store';
import { useTranslation } from 'react-i18next';

interface LocationPoint { lat: number; lng: number; address: string; }
interface VehicleType { id: string; name: string; displayName: string; iconUrl?: string; emoji?: string; description?: string; }

interface Props {
  pickup: LocationPoint;
  dropoff: LocationPoint;
  vehicleTypes: VehicleType[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function FareEstimateSheet({ pickup, dropoff, vehicleTypes, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  const {
    selectedVehicleTypeId, setSelectedVehicleType, setFareEstimate,
    promoCode, promoDiscount, setPromoCode, fareEstimate,
  } = useRideStore();

  const [showPromo, setShowPromo] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [isCreatingRide, setIsCreatingRide] = useState(false);

  // Estimation tarifaire automatique
  const { data: estimates, isLoading } = useQuery({
    queryKey: ['fare-estimate', pickup.lat, pickup.lng, dropoff.lat, dropoff.lng],
    queryFn: () =>
      apiClient.post('/rides/estimate', {
        pickupLat: pickup.lat, pickupLng: pickup.lng,
        dropoffLat: dropoff.lat, dropoffLng: dropoff.lng,
      }).then((r) => r.data.data),
    enabled: !!(pickup && dropoff),
    staleTime: 30_000,
  });

  // Sélectionner le premier type par défaut
  useEffect(() => {
    if (vehicleTypes.length > 0 && !selectedVehicleTypeId) {
      setSelectedVehicleType(vehicleTypes[0].id);
    }
  }, [vehicleTypes]);

  // Mettre à jour l'estimation tarifaire quand on change de véhicule
  useEffect(() => {
    if (estimates && selectedVehicleTypeId) {
      const est = estimates.estimates?.find((e: any) => e.vehicleTypeId === selectedVehicleTypeId);
      if (est) setFareEstimate(est);
    }
  }, [selectedVehicleTypeId, estimates]);

  const handleConfirmRide = async () => {
    if (!selectedVehicleTypeId || !fareEstimate) return;
    setIsCreatingRide(true);

    try {
      await apiClient.post('/rides', {
        pickupLat: pickup.lat, pickupLng: pickup.lng, pickupAddress: pickup.address,
        dropoffLat: dropoff.lat, dropoffLng: dropoff.lng, dropoffAddress: dropoff.address,
        vehicleTypeId: selectedVehicleTypeId,
        paymentMethod: 'CASH',
        ...(promoCode ? { promoCode } : {}),
      });
      onConfirm();
    } catch (err) {
      console.error('Create ride error:', err);
    } finally {
      setIsCreatingRide(false);
    }
  };

  const selectedEstimate = estimates?.estimates?.find(
    (e: any) => e.vehicleTypeId === selectedVehicleTypeId,
  );

  const vehicleEmojis: Record<string, string> = {
    'VTC Economy': '🚗',
    'VTC Confort': '🚙',
    'VTC Premium': '🏎️',
    'Moto': '🏍️',
    'Livraison': '📦',
  };

  return (
    <View style={styles.container}>
      {/* Route info */}
      {estimates && !isLoading && (
        <View style={styles.routeInfo}>
          <Text style={styles.routeText}>
            📍 {estimates.distanceKm} km · ⏱ {estimates.durationMinutes} min
          </Text>
        </View>
      )}

      {/* Vehicle types */}
      {isLoading ? (
        <ActivityIndicator color="#4F46E5" style={{ marginVertical: 16 }} />
      ) : (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vehiclesRow}
        >
          {(vehicleTypes.length > 0 ? vehicleTypes : [
            { id: '1', name: 'Economy', displayName: 'Economy' },
            { id: '2', name: 'Confort', displayName: 'Confort' },
          ]).map((vt) => {
            const est = estimates?.estimates?.find((e: any) => e.vehicleTypeId === vt.id);
            const isSelected = selectedVehicleTypeId === vt.id;
            return (
              <TouchableOpacity
                key={vt.id}
                style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                onPress={() => setSelectedVehicleType(vt.id)}
              >
                <Text style={styles.vehicleEmoji}>
                  {vehicleEmojis[vt.displayName] || '🚗'}
                </Text>
                <Text style={[styles.vehicleName, isSelected && styles.vehicleNameSelected]}>
                  {vt.displayName}
                </Text>
                <Text style={[styles.vehicleFare, isSelected && styles.vehicleFareSelected]}>
                  {est ? `${est.total} ${est.currency}` : '...'}
                </Text>
                {est && (
                  <Text style={styles.vehicleEta}>⏱ {est.etaMinutes} min</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Promo */}
      {promoCode ? (
        <View style={styles.promoApplied}>
          <Text style={styles.promoAppliedText}>
            🏷️ Code {promoCode} — -{promoDiscount.toFixed(2)} TND
          </Text>
          <TouchableOpacity onPress={() => setPromoCode(null)}>
            <Text style={styles.promoRemove}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Bouton confirmer */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, (!selectedEstimate || isCreatingRide) && styles.btnDisabled]}
          onPress={handleConfirmRide}
          disabled={!selectedEstimate || isCreatingRide}
        >
          {isCreatingRide ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmBtnText}>
              Commander · {selectedEstimate?.total ?? '–'} {selectedEstimate?.currency ?? 'TND'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 4, paddingBottom: 8 },
  routeInfo: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 10,
    marginBottom: 12, alignItems: 'center',
  },
  routeText: { fontSize: 13, color: '#475569', fontWeight: '500' },

  vehiclesRow: { paddingHorizontal: 4, gap: 10, paddingBottom: 4 },
  vehicleCard: {
    width: 110, padding: 12, borderRadius: 16, alignItems: 'center',
    backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  vehicleCardSelected: {
    backgroundColor: '#EEF2FF', borderColor: '#4F46E5',
  },
  vehicleEmoji: { fontSize: 28, marginBottom: 4 },
  vehicleName: { fontSize: 12, fontWeight: '600', color: '#475569' },
  vehicleNameSelected: { color: '#4F46E5' },
  vehicleFare: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginTop: 4 },
  vehicleFareSelected: { color: '#4F46E5' },
  vehicleEta: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  promoApplied: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginVertical: 8, borderWidth: 1, borderColor: '#bbf7d0',
  },
  promoAppliedText: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  promoRemove: { fontSize: 12, color: '#ef4444', fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center',
  },
  cancelBtnText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
  confirmBtn: {
    flex: 2.5, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#4F46E5', alignItems: 'center',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.55 },
});
