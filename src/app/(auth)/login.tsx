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

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address.')
    .email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

const signUpSchema = signInSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(2, 'Please enter your name (at least 2 characters).')
    .max(50, 'Name must be 50 characters or less.'),
});

const otpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(
      /^\d{6}$/,
      'Enter the 6-digit verification code sent to your email.'
    ),
});

type AuthMode = 'signIn' | 'signUp' | 'verifyOtp';
type FocusedField = 'fullName' | 'email' | 'password' | 'code' | null;

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  code?: string;
}

export default function LoginScreen() {
  const { signIn, signUp, verifyEmailCode, isSubmitting } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [code, setCode] = useState<string>('');
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [authError, setAuthError] = useState<string | null>(null);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrors({});
    setAuthError(null);
    setShowPassword(false);
    if (nextMode !== 'verifyOtp') {
      setCode('');
    }
  };

  const handleCredentialsSubmit = async () => {
    if (isSubmitting) return;
    setAuthError(null);

    if (mode === 'signIn') {
      const parsed = signInSchema.safeParse({ email, password });
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
        await signIn(parsed.data.email, parsed.data.password);
      } catch (err) {
        setAuthError(
          err instanceof Error
            ? err.message
            : 'Unable to sign in right now. Please try again.'
        );
      }
      return;
    }

    const parsed = signUpSchema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'fullName' && !nextErrors.fullName) {
          nextErrors.fullName = issue.message;
        }
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
      const res = await signUp(
        parsed.data.email,
        parsed.data.password,
        parsed.data.fullName
      );
      if (res.requiresEmailVerification) {
        setMode('verifyOtp');
      }
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Unable to create account right now. Please try again.'
      );
    }
  };

  const handleVerifyOtp = async () => {
    if (isSubmitting) return;
    setAuthError(null);

    const parsed = otpSchema.safeParse({ code });
    if (!parsed.success) {
      setErrors({ code: parsed.error.issues[0]?.message });
      return;
    }

    setErrors({});
    try {
      await verifyEmailCode(parsed.data.code);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Verification failed. Please try again.'
      );
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
          <View style={styles.brandHeader}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>S</Text>
            </View>
            <Text style={styles.brandTitle}>Selena Workspace</Text>
            <Text style={styles.brandSubtitle}>
              {mode === 'verifyOtp'
                ? `We sent a 6-digit code to ${email.trim()}`
                : 'Sign in to access your workspace and account settings'}
            </Text>
          </View>

          <View style={styles.card}>
            {mode !== 'verifyOtp' ? (
              <View style={styles.segmentedControl}>
                <Pressable
                  style={[
                    styles.segment,
                    mode === 'signIn' ? styles.segmentActive : null,
                  ]}
                  onPress={() => switchMode('signIn')}
                  disabled={isSubmitting}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      mode === 'signIn' ? styles.segmentTextActive : null,
                    ]}
                  >
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.segment,
                    mode === 'signUp' ? styles.segmentActive : null,
                  ]}
                  onPress={() => switchMode('signUp')}
                  disabled={isSubmitting}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      mode === 'signUp' ? styles.segmentTextActive : null,
                    ]}
                  >
                    Create Account
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {authError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{authError}</Text>
              </View>
            ) : null}

            {mode === 'verifyOtp' ? (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Verification Code</Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.otpInput,
                      focusedField === 'code' ? styles.inputFocused : null,
                      errors.code ? styles.inputError : null,
                    ]}
                    value={code}
                    onFocus={() => setFocusedField('code')}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={(text) => {
                      setCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                      if (errors.code) {
                        setErrors((prev) => ({ ...prev, code: undefined }));
                      }
                    }}
                    placeholder="000000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isSubmitting}
                  />
                  {errors.code ? (
                    <Text style={styles.errorText}>{errors.code}</Text>
                  ) : null}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    isSubmitting ? styles.buttonDisabled : null,
                    pressed && !isSubmitting ? styles.buttonPressed : null,
                  ]}
                  onPress={() => void handleVerifyOtp()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Verify Email & Continue
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.textLinkButton}
                  onPress={() => switchMode('signUp')}
                  disabled={isSubmitting}
                >
                  <Text style={styles.textLink}>Use a different email</Text>
                </Pressable>
              </>
            ) : (
              <>
                {mode === 'signUp' ? (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Display Name</Text>
                    <TextInput
                      style={[
                        styles.input,
                        focusedField === 'fullName'
                          ? styles.inputFocused
                          : null,
                        errors.fullName ? styles.inputError : null,
                      ]}
                      value={fullName}
                      onFocus={() => setFocusedField('fullName')}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(text) => {
                        setFullName(text);
                        if (errors.fullName) {
                          setErrors((prev) => ({
                            ...prev,
                            fullName: undefined,
                          }));
                        }
                      }}
                      placeholder="Kaushal Sonawane"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="words"
                      autoCorrect={false}
                      textContentType="name"
                      editable={!isSubmitting}
                    />
                    {errors.fullName ? (
                      <Text style={styles.errorText}>{errors.fullName}</Text>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email address</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'email' ? styles.inputFocused : null,
                      errors.email ? styles.inputError : null,
                    ]}
                    value={email}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) {
                        setErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    placeholder="name@company.com"
                    placeholderTextColor="#94A3B8"
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
                  <Text style={styles.label}>Password</Text>
                  <View
                    style={[
                      styles.passwordWrapper,
                      focusedField === 'password' ? styles.inputFocused : null,
                      errors.password ? styles.inputError : null,
                    ]}
                  >
                    <TextInput
                      style={styles.passwordInput}
                      value={password}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (errors.password) {
                          setErrors((prev) => ({
                            ...prev,
                            password: undefined,
                          }));
                        }
                      }}
                      placeholder="Minimum 8 characters"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      editable={!isSubmitting}
                    />
                    <Pressable
                      style={styles.visibilityToggle}
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={8}
                    >
                      <Text style={styles.visibilityText}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </Pressable>
                  </View>
                  {errors.password ? (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  ) : null}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    isSubmitting ? styles.buttonDisabled : null,
                    pressed && !isSubmitting ? styles.buttonPressed : null,
                  ]}
                  onPress={() => void handleCredentialsSubmit()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {mode === 'signIn' ? 'Sign In' : 'Create Account'}
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
    backgroundColor: '#F8FAFC',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brandMarkText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 300,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#0F172A',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '500',
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#0F172A',
  },
  visibilityToggle: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  visibilityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  inputFocused: {
    borderColor: '#0F172A',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  otpInput: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 5,
  },
  primaryButton: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  textLinkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  textLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
});