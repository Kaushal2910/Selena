import { OfflineBanner } from '@/components/offline-banner';

import { env } from '@/config/env';
import { AuthProvider, useAuth } from '@/services/auth-context';
import { tokenCache } from '@/services/token-cache';
import { ClerkProvider } from '@clerk/expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

function RootNavigationGate() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'bootstrapping') return;

    const firstSegment = segments[0];
    const inAuthGroup = firstSegment === '(auth)';

    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [status, segments, router]);

  if (status === 'bootstrapping') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Verifying hardware session...</Text>
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ClerkProvider
        publishableKey={env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
        tokenCache={tokenCache}
      >
        <AuthProvider>
          <OfflineBanner />
          <RootNavigationGate />
        </AuthProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B5563',
  },
});
