const JWT_REGEX = /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g;
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const CLERK_KEY_REGEX = /\b(?:pk|sk)_(?:test|live)_[A-Za-z0-9_-]+\b/g;
const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export function scrubSensitiveData(input: unknown): string {
  let raw: string;

  if (typeof input === 'string') {
    raw = input;
  } else if (input instanceof Error) {
    raw = `${input.name}: ${input.message}`;
  } else {
    try {
      raw = JSON.stringify(input) ?? String(input);
    } catch {
      raw = '[Unserializable Payload]';
    }
  }

  return raw
    .replace(JWT_REGEX, '[REDACTED_TOKEN]')
    .replace(BEARER_REGEX, 'Bearer [REDACTED_TOKEN]')
    .replace(CLERK_KEY_REGEX, '[REDACTED_TOKEN]')
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
}

function scrubContext(
  context?: Record<string, unknown>
): Record<string, string> | undefined {
  if (!context) return undefined;
  const scrubbed: Record<string, string> = {};
  for (const [key, value] of Object.entries(context)) {
    scrubbed[key] = scrubSensitiveData(value);
  }
  return scrubbed;
}

export function addBreadcrumb(category: string, message: string): void {
  const safeCategory = scrubSensitiveData(category);
  const safeMessage = scrubSensitiveData(message);

  // PRODUCTION HOOK: Forward scrubbed breadcrumb to @sentry/react-native when building standalone binaries
  // Sentry.addBreadcrumb({ category: safeCategory, message: safeMessage, level: 'info' });

  if (__DEV__) {
    console.info(`[Telemetry:Breadcrumb][${safeCategory}] ${safeMessage}`);
  }
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const safeMessage = scrubSensitiveData(error);
  const safeContext = scrubContext(context);

  // PRODUCTION HOOK: Forward scrubbed exception to @sentry/react-native when building standalone binaries
  // Sentry.captureException(new Error(safeMessage), { extra: safeContext });

  if (__DEV__) {
    console.warn(
      `[Telemetry:Exception] ${safeMessage}`,
      safeContext ? safeContext : ''
    );
  }
}
