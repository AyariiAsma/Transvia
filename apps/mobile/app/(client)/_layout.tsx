import { Stack } from 'expo-router';

export default function ClientLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen
        name="ride-history"
        options={{
          headerShown: true,
          title: 'Historique',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#4F46E5',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          title: 'Mon Profil',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#4F46E5',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="wallet"
        options={{
          headerShown: true,
          title: 'Mon Wallet',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#4F46E5',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ride/[id]"
        options={{
          headerShown: true,
          title: 'Détails de la course',
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
