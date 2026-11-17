import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_APP_ENV: z.enum(['development', 'preview', 'production']),
  EXPO_PUBLIC_AUTH_PROVIDER: z.enum(['clerk', 'supabase']).default('clerk'),
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is required.')
    .refine((val) => val.startsWith('pk_test_') || val.startsWith('pk_live_'), {
      message:
        'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must start with "pk_test_" or "pk_live_".',
    }),
});

const rawEnv = {
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_AUTH_PROVIDER: process.env.EXPO_PUBLIC_AUTH_PROVIDER,
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  const formattedErrors = parsed.error.issues
    .map((issue) => `  • [${issue.path.join('.') || 'ENV'}]: ${issue.message}`)
    .join('\n');

  throw new Error(
    `\n❌ [FATAL BOOT ERROR] Invalid environment configuration:\n${formattedErrors}\n\nCheck your .env file against .env.example before starting the app.\n`
  );
}

export const env = parsed.data;
