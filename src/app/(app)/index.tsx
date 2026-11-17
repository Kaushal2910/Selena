import { env } from '@/config/env';
import { useAuth } from '@/services/auth-context';
import {
  HttpStatusError,
  OfflineError,
  requestWithRetry,
} from '@/services/http-client';
import { hasPersistedSessionToken } from '@/services/token-cache';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ServiceHealthState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'operational'; latencyMs: number }
  | { status: 'degraded'; message: string };

export default function HomeDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [isKeystoreEncrypted, setIsKeystoreEncrypted] = useState<boolean>(true);
  const [healthState, setHealthState] = useState<ServiceHealthState>({
    status: 'idle',
  });
  const [isSimulatingRetry, setIsSimulatingRetry] = useState<boolean>(false);
  const [retryLogs, setRetryLogs] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void hasPersistedSessionToken().then((persisted) => {
        if (!active) return;
        setIsKeystoreEncrypted(persisted);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const handleCheckApiStatus = async () => {
    if (healthState.status === 'checking' || isSimulatingRetry) return;
    setHealthState({ status: 'checking' });
    setRetryLogs([]);

    const startedAt = Date.now();
    try {
      await requestWithRetry<Record<string, unknown>>(
        'https://httpbin.org/get',
        {
          timeoutMs: 6000,
          maxRetries: 2,
        }
      );
      const latencyMs = Date.now() - startedAt;
      setHealthState({ status: 'operational', latencyMs });
    } catch (err) {
      const message =
        err instanceof OfflineError
          ? 'Device is offline'
          : err instanceof HttpStatusError
            ? `Service responded with HTTP ${err.status}`
            : 'Service unreachable';
      setHealthState({ status: 'degraded', message });
    }
  };

  const handleSimulateFailingEndpoint = async () => {
    if (isSimulatingRetry || healthState.status === 'checking') return;
    setIsSimulatingRetry(true);
    setRetryLogs([]);

    const startedAt = Date.now();
    try {
      await requestWithRetry<Record<string, unknown>>(
        'https://httpbin.org/status/503',
        {
          timeoutMs: 5000,
          maxRetries: 2,
          baseDelayMs: 350,
          onAttempt: (attempt, detail) => {
            setRetryLogs((prev) => [...prev, `Attempt ${attempt}: ${detail}`]);
          },
        }
      );
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      const summary =
        err instanceof OfflineError
          ? 'Aborted immediately: Device is offline.'
          : err instanceof HttpStatusError
            ? `Completed 3 attempts in ${elapsed}ms (HTTP ${err.status}).`
            : `Completed retry cycle in ${elapsed}ms.`;
      setRetryLogs((prev) => [...prev, summary]);
    } finally {
      setIsSimulatingRetry(false);
    }
  };

  const emailHandle = user?.email.split('@')[0] ?? 'Member';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.greeting}>
              {user?.fullName
                ? `Welcome back, ${user.fullName}`
                : 'Welcome back'}
            </Text>
            <Text style={styles.subGreeting}>
              {user?.email ?? 'Authenticated workspace'}
            </Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>{env.EXPO_PUBLIC_APP_ENV}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Workspace Overview</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Session Security</Text>
            <View
              style={[
                styles.badge,
                isKeystoreEncrypted ? styles.badgeGreen : styles.badgeAmber,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isKeystoreEncrypted
                    ? styles.badgeTextGreen
                    : styles.badgeTextAmber,
                ]}
              >
                {isKeystoreEncrypted ? 'Encrypted' : 'Active'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>
            {isKeystoreEncrypted
              ? 'Verified & Hardware-Encrypted via Android Keystore'
              : 'Verified session active in memory'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>API Service Status</Text>
            {healthState.status === 'operational' ? (
              <View style={[styles.badge, styles.badgeGreen]}>
                <Text style={[styles.badgeText, styles.badgeTextGreen]}>
                  Operational · {healthState.latencyMs}ms
                </Text>
              </View>
            ) : healthState.status === 'degraded' ? (
              <View style={[styles.badge, styles.badgeRed]}>
                <Text style={[styles.badgeText, styles.badgeTextRed]}>
                  {healthState.message}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.cardDescription}>
            Verify upstream API reachability and latency with automatic timeout
            and retry protection.
          </Text>

          <View style={styles.actionStack}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                healthState.status === 'checking' || isSimulatingRetry
                  ? styles.buttonDisabled
                  : null,
                pressed ? styles.buttonPressed : null,
              ]}
              onPress={() => void handleCheckApiStatus()}
              disabled={healthState.status === 'checking' || isSimulatingRetry}
            >
              {healthState.status === 'checking' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Check API Status</Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                isSimulatingRetry || healthState.status === 'checking'
                  ? styles.buttonDisabled
                  : null,
                pressed ? styles.buttonPressed : null,
              ]}
              onPress={() => void handleSimulateFailingEndpoint()}
              disabled={isSimulatingRetry || healthState.status === 'checking'}
            >
              {isSimulatingRetry ? (
                <ActivityIndicator color="#0F172A" size="small" />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  Simulate Slow/Failing Endpoint
                </Text>
              )}
            </Pressable>
          </View>

          {retryLogs.length > 0 ? (
            <View style={styles.attemptBox}>
              <View style={styles.attemptHeader}>
                <Text style={styles.attemptHeaderTitle}>Request Trace</Text>
                <Pressable onPress={() => setRetryLogs([])} hitSlop={8}>
                  <Text style={styles.clearLogsText}>Clear</Text>
                </Pressable>
              </View>
              {retryLogs.map((line, idx) => (
                <Text key={`${idx}-${line}`} style={styles.attemptText}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Settings</Text>

        <Pressable
          style={({ pressed }) => [
            styles.navCard,
            pressed ? styles.buttonPressed : null,
          ]}
          onPress={() => router.push('/(app)/details')}
        >
          <View style={styles.navCardContent}>
            <Text style={styles.navCardTitle}>Account & Security</Text>
            <Text style={styles.navCardSubtitle}>
              Profile details, encryption status, and session management
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  attemptHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  clearLogsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subGreeting: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    textTransform: 'capitalize',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
  },
  badgeAmber: {
    backgroundColor: '#FFFBEB',
  },
  badgeRed: {
    backgroundColor: '#FEF2F2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextGreen: {
    color: '#047857',
  },
  badgeTextAmber: {
    color: '#B45309',
  },
  badgeTextRed: {
    color: '#B91C1C',
  },
  actionStack: {
    marginTop: 14,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  attemptBox: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  attemptText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  navCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  navCardContent: {
    flex: 1,
  },
  navCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  navCardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
