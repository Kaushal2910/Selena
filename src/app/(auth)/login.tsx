import { useAuth } from '@/services/auth-context';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

type AuthMode = 'sign-in' | 'sign-up' | 'verify-email';

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

const otpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit numeric code sent to your email.'),
});

interface FieldErrors {
  email?: string;
  password?: string;
  code?: string;
  general?: string;
}

export default function LoginScreen() {
  const { signIn, signUp, verifyEmailCode, isSubmitting } = useAuth();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const switchMode = (nextMode: AuthMode) => {
    if (isSubmitting) return;
    setErrors({});
    setCode('');
    setMode(nextMode);
  };

  const handleCredentialsSubmit = async () => {
    if (isSubmitting) return;

    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'email' && !nextErrors.email) {
          nextErrors.email = issue.message;
        }
        if (field === 'password' && !nextErrors.password) {
          nextErrors.password = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    try {
      if (mode === 'sign-in') {
        await signIn(parsed.data.email, parsed.data.password);
      } else {
        const res = await signUp(parsed.data.email, parsed.data.password);
        if (res.requiresEmailVerification) {
          setMode('verify-email');
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Authentication failed.';
      setErrors({ general: message });
    }
  };

  const handleVerifyCode = async () => {
    if (isSubmitting) return;

    const parsed = otpSchema.safeParse({ code });
    if (!parsed.success) {
      setErrors({
        code: parsed.error.issues[0]?.message ?? 'Invalid verification code.',
      });
      return;
    }

    setErrors({});
    try {
      await verifyEmailCode(parsed.data.code);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Verification failed.';
      setErrors({ general: message });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {mode !== 'verify-email' ? (
              <View style={styles.modeToggleRow}>
                <Pressable
                  style={[
                    styles.modeTab,
                    mode === 'sign-in' ? styles.modeTabActive : null,
                  ]}
                  onPress={() => switchMode('sign-in')}
                  disabled={isSubmitting}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      mode === 'sign-in' ? styles.modeTabTextActive : null,
                    ]}
                  >
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modeTab,
                    mode === 'sign-up' ? styles.modeTabActive : null,
                  ]}
                  onPress={() => switchMode('sign-up')}
                  disabled={isSubmitting}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      mode === 'sign-up' ? styles.modeTabTextActive : null,
                    ]}
                  >
                    Create Account
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.title}>
              {mode === 'sign-in'
                ? 'Welcome Back'
                : mode === 'sign-up'
                  ? 'Create Account'
                  : 'Verify Your Email'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'verify-email'
                ? `Enter the 6-digit verification code sent to ${email.trim()}`
                : 'Zero-SMS hardware-backed Clerk authentication'}
            </Text>

            {errors.general ? (
              <View style={styles.bannerError}>
                <Text style={styles.bannerErrorText}>{errors.general}</Text>
              </View>
            ) : null}

            {mode === 'verify-email' ? (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>6-Digit Verification Code</Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.otpInput,
                      errors.code ? styles.inputError : null,
                    ]}
                    value={code}
                    onChangeText={(text) => {
                      setCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                      if (errors.code || errors.general) {
                        setErrors({});
                      }
                    }}
                    placeholder="123456"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  {errors.code ? (
                    <Text style={styles.errorText}>{errors.code}</Text>
                  ) : null}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    isSubmitting ? styles.buttonDisabled : null,
                    pressed && !isSubmitting ? styles.buttonPressed : null,
                  ]}
                  onPress={() => void handleVerifyCode()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Verify & Continue</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.secondaryLink}
                  onPress={() => switchMode('sign-up')}
                  disabled={isSubmitting}
                >
                  <Text style={styles.secondaryLinkText}>Back to Sign Up</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.email ? styles.inputError : null,
                    ]}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email || errors.general) {
                        setErrors((prev) => ({
                          ...prev,
                          email: undefined,
                          general: undefined,
                        }));
                      }
                    }}
                    placeholder="you@example.com"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    editable={!isSubmitting}
                  />
                  {errors.email ? (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  ) : null}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Password (min 8 chars)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.password ? styles.inputError : null,
                    ]}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password || errors.general) {
                        setErrors((prev) => ({
                          ...prev,
                          password: undefined,
                          general: undefined,
                        }));
                      }
                    }}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    textContentType="password"
                    editable={!isSubmitting}
                  />
                  {errors.password ? (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  ) : null}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    isSubmitting ? styles.buttonDisabled : null,
                    pressed && !isSubmitting ? styles.buttonPressed : null,
                  ]}
                  onPress={() => void handleCredentialsSubmit()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeTabTextActive: {
    color: '#111827',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 18,
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  bannerErrorText: {
    fontSize: 13,
    color: '#B91C1C',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  otpInput: {
    fontSize: 20,
    letterSpacing: 6,
    textAlign: 'center',
    fontWeight: '700',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryLink: {
    marginTop: 14,
    alignItems: 'center',
  },
  secondaryLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
});
