import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, Keyboard, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, MapPin, Clock, ChevronRight } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api.client';

interface LocationResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface SelectedLocation {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
}

interface Props {
  visible: boolean;
  target: 'pickup' | 'dropoff';
  currentLat?: number;
  currentLng?: number;
  onSelect: (location: SelectedLocation) => void;
  onClose: () => void;
}

const RECENT_SEARCHES: LocationResult[] = [
  { placeId: 'r1', description: 'Avenue Habib Bourguiba, Tunis', mainText: 'Avenue Habib Bourguiba', secondaryText: 'Tunis Centre' },
  { placeId: 'r2', description: 'Aéroport Tunis-Carthage', mainText: 'Aéroport Tunis-Carthage', secondaryText: 'La Charguia' },
  { placeId: 'r3', description: 'Lac 1, Tunis', mainText: 'Lac 1', secondaryText: 'Tunis' },
];

export function SearchLocationModal({ visible, target, currentLat, currentLng, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Autocomplete
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['places-autocomplete', query, currentLat, currentLng],
    queryFn: () =>
      apiClient.get('/geo/places/autocomplete', {
        params: { input: query, lat: currentLat, lng: currentLng },
      }).then((r) => r.data.data as LocationResult[]),
    enabled: query.length >= 2,
    staleTime: 10_000,
  });

  const handleSelectPlace = useCallback(async (place: LocationResult) => {
    setIsLoadingDetails(true);
    Keyboard.dismiss();
    try {
      const { data } = await apiClient.get('/geo/places/details', {
        params: { placeId: place.placeId },
      });
      const details = data.data;
      if (details) {
        onSelect({
          lat: details.lat,
          lng: details.lng,
          address: place.mainText,
          placeId: place.placeId,
        });
        setQuery('');
      }
    } catch {
      // Fallback — on utilise une position approximative
      onSelect({
        lat: currentLat || 36.8065,
        lng: currentLng || 10.1815,
        address: place.mainText,
        placeId: place.placeId,
      });
    } finally {
      setIsLoadingDetails(false);
    }
  }, [currentLat, currentLng, onSelect]);

  const handleUseCurrentLocation = () => {
    if (currentLat && currentLng) {
      onSelect({ lat: currentLat, lng: currentLng, address: 'Ma position actuelle' });
      setQuery('');
    }
  };

  const displayList = query.length >= 2 ? suggestions : RECENT_SEARCHES;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text style={styles.headerLabel}>
              {target === 'pickup' ? '📍 Point de départ' : '🎯 Destination'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Search input */}
        <View style={styles.searchContainer}>
          <Search size={16} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder={target === 'pickup' ? 'Rechercher un point de départ...' : 'Où souhaitez-vous aller ?'}
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {isLoading && <ActivityIndicator size="small" color="#4F46E5" style={{ marginLeft: 8 }} />}
        </View>

        {/* Ma position */}
        {target === 'pickup' && (
          <TouchableOpacity style={styles.currentLocBtn} onPress={handleUseCurrentLocation}>
            <View style={styles.currentLocIcon}>
              <MapPin size={16} color="#4F46E5" />
            </View>
            <View style={styles.currentLocText}>
              <Text style={styles.currentLocTitle}>Ma position actuelle</Text>
              <Text style={styles.currentLocSub}>Utiliser le GPS</Text>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}

        {/* Résultats */}
        {query.length >= 2 && suggestions.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucun résultat pour « {query} »</Text>
          </View>
        )}

        {query.length < 2 && (
          <Text style={styles.sectionLabel}>
            <Clock size={12} color="#94a3b8" /> Recherches récentes
          </Text>
        )}

        <FlatList
          data={displayList}
          keyExtractor={(item) => item.placeId}
          keyboardShouldPersistTaps="always"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestion}
              onPress={() => handleSelectPlace(item)}
              disabled={isLoadingDetails}
            >
              <View style={styles.suggestionIcon}>
                <MapPin size={14} color="#4F46E5" />
              </View>
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionMain} numberOfLines={1}>{item.mainText}</Text>
                <Text style={styles.suggestionSecondary} numberOfLines={1}>{item.secondaryText}</Text>
              </View>
              <ChevronRight size={14} color="#cbd5e1" />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        {isLoadingDetails && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Récupération des détails...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: {},
  headerLabel: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#f8fafc', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#1e293b' },

  currentLocBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  currentLocIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  currentLocText: { flex: 1 },
  currentLocTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  currentLocSub: { fontSize: 12, color: '#64748b', marginTop: 1 },

  sectionLabel: {
    paddingHorizontal: 20, paddingVertical: 10,
    fontSize: 12, color: '#94a3b8', fontWeight: '600',
  },

  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  suggestionIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center',
  },
  suggestionText: { flex: 1 },
  suggestionMain: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  suggestionSecondary: { fontSize: 12, color: '#64748b', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#f8fafc', marginLeft: 66 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#94a3b8', fontSize: 14 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { color: '#64748b', fontSize: 14 },
});
