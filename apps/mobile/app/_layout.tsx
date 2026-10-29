import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { initI18n } from '@/i18n';
import { setupNotifications } from '@/services/notification.service';
import { setupBackgroundLocation } from '@/services/location.service';

// Initialiser i18n au démarrage
initI18n();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function RootNavigator() {
  const { user, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (user && inAuthGroup) {
      // Rediriger selon le rôle
      switch (user.role) {
        case 'CLIENT':
          router.replace('/(client)/home');
          break;
        case 'CHAUFFEUR':
          router.replace('/(driver)/home');
          break;
        case 'ADMIN':
          router.replace('/(admin)/dashboard');
          break;
        default:
          router.replace('/(auth)/welcome');
      }
    }
  }, [user, isLoading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  useEffect(() => {
    // Configurer les notifications push
    setupNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
