import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { apiClient } from './api.client';
import { DISPATCH_CONFIG } from '@logistic/shared';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

/**
 * Définit la tâche de fond pour la localisation (chauffeurs)
 * Doit être appelé au niveau racine de l'app (hors composant)
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundLocation] Erreur:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];

    if (location) {
      try {
        // Envoyer la position au backend
        await apiClient.patch('/driver/status', {
          isOnline: true,
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      } catch (err) {
        // Ignorer les erreurs réseau en background
      }
    }
  }
});

/**
 * Démarre le suivi de localisation en arrière-plan (chauffeurs)
 */
export async function startBackgroundLocation(): Promise<boolean> {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') return false;

  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  if (background !== 'granted') return false;

  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (!isRunning) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: DISPATCH_CONFIG.LOCATION_UPDATE_INTERVAL_S * 1000,
      distanceInterval: 10, // minimum 10m de déplacement
      foregroundService: {
        notificationTitle: 'LogisticApp',
        notificationBody: 'Vous êtes en ligne — position active',
        notificationColor: '#4F46E5',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });
  }

  return true;
}

/**
 * Arrête le suivi de localisation en arrière-plan
 */
export async function stopBackgroundLocation(): Promise<void> {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

/**
 * Obtient la position actuelle de l'utilisateur
 */
export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };
  } catch {
    return null;
  }
}

/**
 * Configurer la localisation de fond (appeler dans _layout.tsx)
 */
export function setupBackgroundLocation() {
  // La tâche est définie via TaskManager.defineTask ci-dessus
  // Cette fonction peut être utilisée pour initialiser des listeners
}
