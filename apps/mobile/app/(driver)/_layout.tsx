import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen
        name="earnings"
        options={{
          headerShown: true,
          title: 'Mes Gains',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#4F46E5',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="documents"
        options={{
          headerShown: true,
          title: 'Mes Documents',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          title: 'Mon Profil',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          headerShown: true,
          title: 'Inscription Chauffeur',
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
