import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from './api.client';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Configurer les notifications push (appeler dans _layout.tsx)
 */
export async function setupNotifications() {
  if (!Device.isDevice) {
    console.log('[Notifications] Simulateur — notifications désactivées');
    return;
  }

  // Permissions
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission refusée');
    return;
  }

  // Canal Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rides', {
      name: 'Courses',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
      sound: 'ride_request',
    });

    await Notifications.setNotificationChannelAsync('general', {
      name: 'Général',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Récupérer le token Expo Push
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    });

    // Enregistrer le token en base
    await registerDeviceToken(token.data);
  } catch (err) {
    console.error('[Notifications] Token error:', err);
  }
}

/**
 * Enregistrer le token FCM/APNS en base de données
 */
async function registerDeviceToken(token: string) {
  try {
    await apiClient.post('/users/me/device', {
      fcmToken: token,
      platform: Platform.OS,
    });
  } catch (err) {
    console.error('[Notifications] Device registration error:', err);
  }
}

/**
 * Listener de notification reçue (foreground)
 */
export function addNotificationListener(
  onNotification: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(onNotification);
}

/**
 * Listener de tap sur notification
 */
export function addNotificationResponseListener(
  onResponse: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(onResponse);
}

/**
 * Réinitialiser le badge
 */
export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}
