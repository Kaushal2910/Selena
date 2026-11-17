import { scrubSensitiveData } from '@/services/telemetry';

describe('telemetry PII scrubbing', () => {
  it('redacts JWT strings, Bearer tokens, Clerk keys, and email addresses', () => {
    const fakeJwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMTIzIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const rawMessage = `Auth failure with Bearer ${fakeJwt}, token=${fakeJwt}, pk=pk_test_abc123XYZ, sk=sk_live_secret987, user=kaushal.dev@example.com`;

    const scrubbed = scrubSensitiveData(rawMessage);

    expect(scrubbed).not.toContain('eyJhbGci');
    expect(scrubbed).not.toContain('pk_test_abc123XYZ');
    expect(scrubbed).not.toContain('sk_live_secret987');
    expect(scrubbed).not.toContain('kaushal.dev@example.com');
    expect(scrubbed).toContain('Bearer [REDACTED_TOKEN]');
    expect(scrubbed).toContain('token=[REDACTED_TOKEN]');
    expect(scrubbed).toContain('pk=[REDACTED_TOKEN]');
    expect(scrubbed).toContain('sk=[REDACTED_TOKEN]');
    expect(scrubbed).toContain('user=[REDACTED_EMAIL]');
  });

  it('scrubs sensitive fields inside Error instances', () => {
    const error = new Error(
      'Session expired for alice@company.org using pk_live_999888777'
    );

    const scrubbed = scrubSensitiveData(error);

    expect(scrubbed).toBe(
      'Error: Session expired for [REDACTED_EMAIL] using [REDACTED_TOKEN]'
    );
  });

  it('preserves safe non-sensitive diagnostic messages intact', () => {
    const safeMessage =
      'HTTP attempt 2 succeeded in 142ms with status 200 on route /(app)/details';

    expect(scrubSensitiveData(safeMessage)).toBe(safeMessage);
  });
});
