import { captureException, scrubSensitiveData } from '@/services/telemetry';
import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    captureException(error, { boundary: 'RouteErrorBoundary' });
  }, [error]);

  const safeSummary = scrubSensitiveData(error.message);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.badge}>Recovery Mode</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.description}>
            This screen encountered an unexpected render error. Sensitive
            session data has been automatically redacted from diagnostics.
          </Text>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Sanitized Error Summary</Text>
            <Text style={styles.summaryText}>{safeSummary}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
            ]}
            onPress={() => void retry()}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
    marginBottom: 16,
  },
  summaryBox: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#FCA5A5',
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
