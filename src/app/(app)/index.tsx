import { env } from '@/config/env';
import { useAuth } from '@/services/auth-context';
import { hasPersistedSessionToken } from '@/services/token-cache';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LifecycleLog {
  id: string;
  event: 'MOUNT (useEffect)' | 'FOCUS (useFocusEffect)' | 'BLUR (cleanup)';
  timestamp: string;
}

function formatTime(): string {
  return new Date().toISOString().split('T')[1]?.replace('Z', '') ?? '';
}

export default function ProtectedHomeScreen() {
  const { user, signOut, isSubmitting } = useAuth();
  const router = useRouter();
  const [mountTime, setMountTime] = useState<string>('Pending...');
  const [focusCount, setFocusCount] = useState<number>(0);
  const [logs, setLogs] = useState<LifecycleLog[]>([]);
  const [keystorePersisted, setKeystorePersisted] = useState<boolean | null>(
    null
  );

  const appendLog = useCallback((event: LifecycleLog['event']) => {
    const timestamp = formatTime();
    setLogs((prev) => [
      { id: `${Date.now()}-${Math.random()}`, event, timestamp },
      ...prev.slice(0, 9),
    ]);
    return timestamp;
  }, []);

  useEffect(() => {
    let active = true;

    async function inspectKeystoreAndMount() {
      const persisted = await hasPersistedSessionToken();
      if (!active) return;
      setKeystorePersisted(persisted);
      const ts = appendLog('MOUNT (useEffect)');
      setMountTime(ts);
    }

    void inspectKeystoreAndMount();

    return () => {
      active = false;
    };
  }, [appendLog]);

  useFocusEffect(
    useCallback(() => {
      appendLog('FOCUS (useFocusEffect)');
      setFocusCount((prev) => prev + 1);

      return () => {
        appendLog('BLUR (cleanup)');
      };
    }, [appendLog])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Clerk Session</Text>
            <View
              style={[
                styles.badge,
                keystorePersisted === true
                  ? styles.badgeSuccess
                  : keystorePersisted === false
                    ? styles.badgeWarning
                    : styles.badgeNeutral,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  keystorePersisted === true
                    ? styles.badgeTextSuccess
                    : keystorePersisted === false
                      ? styles.badgeTextWarning
                      : styles.badgeTextNeutral,
                ]}
              >
                {keystorePersisted === true
                  ? 'Keystore: Token Persisted'
                  : keystorePersisted === false
                    ? 'Keystore: Empty'
                    : 'Keystore: Checking...'}
              </Text>
            </View>
          </View>

          <Text style={styles.metaText}>
            Clerk User ID:{' '}
            <Text style={styles.monoBold}>{user?.id ?? 'Unavailable'}</Text>
          </Text>
          <Text style={styles.metaText}>
            Verified Email:{' '}
            <Text style={styles.bold}>{user?.email ?? 'Unavailable'}</Text>
          </Text>
          <Text style={styles.metaText}>
            Environment:{' '}
            <Text style={styles.bold}>{env.EXPO_PUBLIC_APP_ENV}</Text>
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lifecycle Inspector</Text>
          <Text style={styles.helperText}>
            Push Details to cover this screen. Notice how Mount timestamp stays
            constant in RAM while Focus fires again on return.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Mounted At</Text>
              <Text style={styles.statValue}>{mountTime}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Focus Count</Text>
              <Text style={styles.statValue}>{focusCount}</Text>
            </View>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/(app)/details')}
          >
            <Text style={styles.primaryButtonText}>
              Push Details Route (Test Focus)
            </Text>
          </Pressable>

          <View style={styles.logBox}>
            <Text style={styles.logHeader}>Event Timeline (Newest First)</Text>
            {logs.map((entry) => (
              <Text key={entry.id} style={styles.logEntry}>
                [{entry.timestamp}] {entry.event}
              </Text>
            ))}
          </View>
        </View>

        <Pressable
          style={[
            styles.signOutButton,
            isSubmitting ? styles.buttonDisabled : null,
          ]}
          onPress={() => void signOut()}
          disabled={isSubmitting}
        >
          <Text style={styles.signOutText}>Sign Out & Purge Keystore</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeNeutral: {
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextSuccess: {
    color: '#166534',
  },
  badgeTextWarning: {
    color: '#92400E',
  },
  badgeTextNeutral: {
    color: '#4B5563',
  },
  metaText: {
    fontSize: 14,
    color: '#374151',
    marginTop: 6,
  },
  bold: {
    fontWeight: '600',
    color: '#111827',
  },
  monoBold: {
    fontFamily: 'monospace',
    fontWeight: '600',
    fontSize: 13,
    color: '#111827',
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  logEntry: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#E5E7EB',
    marginBottom: 3,
  },
  signOutButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signOutText: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '600',
  },
});
