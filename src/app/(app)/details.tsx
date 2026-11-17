import { env } from '@/config/env';
import { useAuth } from '@/services/auth-context';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SecurityControlItem {
  title: string;
  description: string;
  status: string;
}

const SECURITY_CONTROLS: SecurityControlItem[] = [
  {
    title: 'Hardware Keystore Encryption',
    description:
      'Session credentials are encrypted at rest on device hardware.',
    status: 'Enabled',
  },
  {
    title: 'Network Timeout Protection',
    description: 'Automatic request timeouts, offline detection, and backoff.',
    status: 'Active',
  },
];

export default function AccountAndSecurityScreen() {
  const { user, signOut, isSubmitting } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionLabel}>Profile Summary</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {user?.email ?? 'Unavailable'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>User ID</Text>
            <Text style={styles.rowValueMono} numberOfLines={1}>
              {user?.id ?? 'Unavailable'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Environment</Text>
            <Text style={styles.rowValueCapitalized}>
              {env.EXPO_PUBLIC_APP_ENV}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Active Security Controls</Text>
        <View style={styles.card}>
          {SECURITY_CONTROLS.map((item, index) => (
            <React.Fragment key={item.title}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.securityRow}>
                <View style={styles.securityTextGroup}>
                  <Text style={styles.securityTitle}>{item.title}</Text>
                  <Text style={styles.securityDescription}>
                    {item.description}
                  </Text>
                </View>
                <View style={styles.enabledBadge}>
                  <Text style={styles.enabledBadgeText}>{item.status}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            isSubmitting ? styles.buttonDisabled : null,
            pressed && !isSubmitting ? styles.buttonPressed : null,
          ]}
          onPress={() => void signOut()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#B91C1C" size="small" />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 20,
    paddingBottom: 36,
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
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 22,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 16,
  },
  rowLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  rowValueMono: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#0F172A',
    fontWeight: '600',
  },
  rowValueCapitalized: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  securityTextGroup: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  securityDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },
  enabledBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  enabledBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  signOutButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  signOutText: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '600',
  },
});
