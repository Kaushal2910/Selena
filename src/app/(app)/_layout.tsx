import { Stack } from 'expo-router';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#F8FAFC' },
        headerTintColor: '#0F172A',
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="details"
        options={{ title: 'Account & Security', presentation: 'card' }}
      />
    </Stack>
  );
}
