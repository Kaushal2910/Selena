import { Stack } from 'expo-router';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen
        name="details"
        options={{ title: 'Reliability & Chaos Lab', presentation: 'modal' }}
      />
    </Stack>
  );
}
