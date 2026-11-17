import { CLERK_SESSION_KEY, clearSecureToken } from '@/services/token-cache';
import {
  useAuth as useClerkAuth,
  useSignIn,
  useSignUp,
  useUser,
} from '@clerk/expo';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type AuthStatus = 'bootstrapping' | 'unauthenticated' | 'authenticated';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  isSubmitting: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ requiresEmailVerification: boolean }>;
  verifyEmailCode: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface ClerkErrorItem {
  code?: string;
  message?: string;
  longMessage?: string;
}

interface ClerkErrorShape {
  errors?: ClerkErrorItem[];
}

function mapClerkError(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'errors' in err) {
    const clerkErr = err as ClerkErrorShape;
    const first = clerkErr.errors?.[0];
    if (first) {
      switch (first.code) {
        case 'form_password_incorrect':
          return 'Incorrect email or password. Please try again.';
        case 'form_identifier_not_found':
          return 'No account found with that email address.';
        case 'form_identifier_exists':
          return 'An account with this email already exists.';
        case 'form_password_pwned':
          return 'This password has appeared in a data breach. Choose a stronger password.';
        case 'form_code_incorrect':
          return 'Invalid verification code. Please check your email and try again.';
        case 'verification_expired':
          return 'Verification code expired. Please request a new code.';
        case 'too_many_requests':
          return 'Too many attempts. Please wait a moment and try again.';
        default:
          if (typeof first.message === 'string' && first.message.length > 0) {
            return first.message;
          }
      }
    }
  }
  return 'Authentication failed. Please check your connection and try again.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    isLoaded: isAuthLoaded,
    isSignedIn,
    signOut: clerkSignOut,
  } = useClerkAuth();
  const { isLoaded: isUserLoaded, user: clerkUser } = useUser();
  const { signIn: clerkSignIn } = useSignIn();
  const { signUp: clerkSignUp } = useSignUp();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const status: AuthStatus = useMemo(() => {
    if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
      return 'bootstrapping';
    }
    return isSignedIn ? 'authenticated' : 'unauthenticated';
  }, [isAuthLoaded, isSignedIn, isUserLoaded]);

  const user: AuthUser | null = useMemo(() => {
    if (!isSignedIn || !clerkUser) return null;
    const primaryEmail =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      '';
    return {
      id: clerkUser.id,
      email: primaryEmail,
    };
  }, [isSignedIn, clerkUser]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      if (isSubmitting || !clerkSignIn) return;

      setIsSubmitting(true);
      try {
        const { error } = await clerkSignIn.password({
          emailAddress: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          throw new Error(mapClerkError(error));
        }

        if (clerkSignIn.status === 'complete') {
          await clerkSignIn.finalize();
        } else {
          throw new Error(
            'Additional verification steps are required for this account.'
          );
        }
      } catch (err) {
        if (err instanceof Error) {
          throw err;
        }
        throw new Error(mapClerkError(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, clerkSignIn]
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ requiresEmailVerification: boolean }> => {
      if (isSubmitting || !clerkSignUp) {
        return { requiresEmailVerification: false };
      }

      setIsSubmitting(true);
      try {
        const { error } = await clerkSignUp.password({
          emailAddress: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          throw new Error(mapClerkError(error));
        }

        if (clerkSignUp.status === 'complete') {
          await clerkSignUp.finalize();
          return { requiresEmailVerification: false };
        }

        if (clerkSignUp.status === 'missing_requirements') {
          const { error: sendError } =
            await clerkSignUp.verifications.sendEmailCode();
          if (sendError) {
            throw new Error(mapClerkError(sendError));
          }
          return { requiresEmailVerification: true };
        }

        throw new Error('Additional sign-up requirements are pending.');
      } catch (err) {
        if (err instanceof Error) {
          throw err;
        }
        throw new Error(mapClerkError(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, clerkSignUp]
  );

  const verifyEmailCode = useCallback(
    async (code: string): Promise<void> => {
      if (isSubmitting || !clerkSignUp) return;

      setIsSubmitting(true);
      try {
        const { error } = await clerkSignUp.verifications.verifyEmailCode({
          code: code.trim(),
        });

        if (error) {
          throw new Error(mapClerkError(error));
        }

        if (clerkSignUp.status === 'complete') {
          await clerkSignUp.finalize();
        } else {
          throw new Error('Verification could not be completed. Try again.');
        }
      } catch (err) {
        if (err instanceof Error) {
          throw err;
        }
        throw new Error(mapClerkError(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, clerkSignUp]
  );

  const signOut = useCallback(async (): Promise<void> => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await clerkSignOut();
    } finally {
      await clearSecureToken(CLERK_SESSION_KEY);
      setIsSubmitting(false);
    }
  }, [isSubmitting, clerkSignOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isSubmitting,
      signIn,
      signUp,
      verifyEmailCode,
      signOut,
    }),
    [status, user, isSubmitting, signIn, signUp, verifyEmailCode, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
