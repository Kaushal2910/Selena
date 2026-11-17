import * as Network from 'expo-network';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const networkState = Network.useNetworkState();
  const insets = useSafeAreaInsets();
  const [initialOffline, setInitialOffline] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    void Network.getNetworkStateAsync().then((state) => {
      if (!active) return;
      setInitialOffline(state.isConnected === false);
    });
    return () => {
      active = false;
    };
  }, []);

  const isOffline =
    networkState.isConnected !== undefined
      ? networkState.isConnected === false
      : initialOffline;

  if (!isOffline) {
    return null;
  }

  return (
    <View
      style={[styles.banner, { paddingTop: Math.max(insets.top, 8) }]}
      accessibilityRole="alert"
    >
      <Text style={styles.bannerTitle}>Offline Mode</Text>
      <Text style={styles.bannerSubtitle}>
        No internet connection. Network requests are paused.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#B91C1C',
    paddingBottom: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    color: '#FEE2E2',
    fontSize: 12,
    marginTop: 2,
  },
});
