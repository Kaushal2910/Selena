import {
  HttpStatusError,
  OfflineError,
  requestWithRetry,
} from '@/services/http-client';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AttemptEntry {
  id: string;
  text: string;
}

export default function ReliabilityChaosLabScreen() {
  const router = useRouter();
  const [shouldCrash, setShouldCrash] = useState<boolean>(false);
  const [isTestingNetwork, setIsTestingNetwork] = useState<boolean>(false);
  const [attemptLogs, setAttemptLogs] = useState<AttemptEntry[]>([]);

  if (shouldCrash) {
    throw new Error(
      'Simulated render fault for token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig and user test@example.com'
    );
  }

  const appendLog = (text: string) => {
    setAttemptLogs((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, text },
    ]);
  };

  const handleTestResilientCall = async () => {
    if (isTestingNetwork) return;
    setIsTestingNetwork(true);
    setAttemptLogs([]);

    const startedAt = Date.now();
    appendLog('Starting requestWithRetry (timeoutMs: 1200, maxRetries: 2)...');

    try {
      // Uses a deliberately slow endpoint (3s delay) against a 1200ms timeout to demonstrate AbortController + backoff retries
      await requestWithRetry<Record<string, unknown>>(
        'https://httpbin.org/delay/3',
        {
          timeoutMs: 1200,
          maxRetries: 2,
          baseDelayMs: 350,
          onAttempt: (attempt, detail) => {
            appendLog(`[Attempt ${attempt}] ${detail}`);
          },
        }
      );

      const elapsed = Date.now() - startedAt;
      appendLog(`Succeeded in ${elapsed}ms.`);
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      if (err instanceof OfflineError) {
        appendLog(`Aborted immediately (${elapsed}ms): ${err.message}`);
      } else if (err instanceof HttpStatusError) {
        appendLog(`HTTP ${err.status} after ${elapsed}ms: ${err.message}`);
      } else if (err instanceof Error) {
        appendLog(
          `Exhausted retries after ${elapsed}ms (${err.name}): ${err.message}`
        );
      } else {
        appendLog(`Failed after ${elapsed}ms with unknown error.`);
      }
    } finally {
      setIsTestingNetwork(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Resilient HTTP Client</Text>
          <Text style={styles.body}>
            Dispatches a request with a 1200ms AbortController timeout against a
            3000ms delayed endpoint (or fails fast if Airplane Mode is active)
            to demonstrate exponential backoff + jitter.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              isTestingNetwork ? styles.buttonDisabled : null,
              pressed && !isTestingNetwork ? styles.buttonPressed : null,
            ]}
            onPress={() => void handleTestResilientCall()}
            disabled={isTestingNetwork}
          >
            {isTestingNetwork ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Test Resilient Network Call (Timeout & Backoff)
              </Text>
            )}
          </Pressable>

          <View style={styles.logBox}>
            <Text style={styles.logHeader}>Attempt & Latency Log</Text>
            {attemptLogs.length === 0 ? (
              <Text style={styles.logPlaceholder}>
                Tap the button above to run a simulated timeout/retry cycle.
              </Text>
            ) : (
              attemptLogs.map((entry) => (
                <Text key={entry.id} style={styles.logEntry}>
                  {entry.text}
                </Text>
              ))
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Error Boundary & PII Scrub</Text>
          <Text style={styles.body}>
            Throws a synchronous render exception containing a mock JWT and
            email address. Verify that RouteErrorBoundary catches it, scrubs PII
            in console logs, and recovers when tapping Try Again.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.dangerButton,
              pressed ? styles.buttonPressed : null,
            ]}
            onPress={() => setShouldCrash(true)}
          >
            <Text style={styles.dangerButtonText}>
              Trigger Controlled Render Crash
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Pop Back to Home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4B5563',
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  logBox: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
  },
  logHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  logPlaceholder: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#6B7280',
  },
  logEntry: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#E5E7EB',
    marginBottom: 4,
  },
});
