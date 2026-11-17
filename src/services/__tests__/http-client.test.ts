import {
  HttpStatusError,
  OfflineError,
  requestWithRetry,
} from '@/services/http-client';
import * as Network from 'expo-network';

jest.mock('expo-network', () => ({
  NetworkStateType: {
    NONE: 'NONE',
    WIFI: 'WIFI',
  },
  getNetworkStateAsync: jest.fn(),
}));

const mockedGetNetworkState = jest.mocked(Network.getNetworkStateAsync);

function makeMockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('requestWithRetry', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetNetworkState.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: Network.NetworkStateType.WIFI,
    });
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  it('throws OfflineError immediately without calling fetch when device is offline', async () => {
    mockedGetNetworkState.mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
      type: Network.NetworkStateType.NONE,
    });

    await expect(
      requestWithRetry('https://api.example.com/profile')
    ).rejects.toThrow(OfflineError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails immediately on attempt 1 with zero retries for HTTP 401 and 400', async () => {
    fetchSpy.mockResolvedValueOnce(
      makeMockResponse(401, { error: 'Unauthorized' })
    );

    await expect(
      requestWithRetry('https://api.example.com/secret', {
        maxRetries: 3,
        baseDelayMs: 1,
      })
    ).rejects.toThrow(HttpStatusError);

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy.mockClear();
    fetchSpy.mockResolvedValueOnce(
      makeMockResponse(400, { error: 'Bad Request' })
    );

    await expect(
      requestWithRetry('https://api.example.com/bad', {
        maxRetries: 3,
        baseDelayMs: 1,
      })
    ).rejects.toThrow(HttpStatusError);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries transient HTTP 503 errors up to maxRetries and succeeds if a retry recovers', async () => {
    fetchSpy
      .mockResolvedValueOnce(makeMockResponse(503, { error: 'Unavailable' }))
      .mockResolvedValueOnce(makeMockResponse(503, { error: 'Unavailable' }))
      .mockResolvedValueOnce(makeMockResponse(200, { status: 'healthy' }));

    const result = await requestWithRetry<{ status: string }>(
      'https://api.example.com/health',
      {
        maxRetries: 2,
        baseDelayMs: 1,
      }
    );

    expect(result).toEqual({ status: 'healthy' });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('throws HttpStatusError after exhausting maxRetries on persistent HTTP 503', async () => {
    fetchSpy.mockResolvedValue(makeMockResponse(503, { error: 'Down' }));

    await expect(
      requestWithRetry('https://api.example.com/down', {
        maxRetries: 2,
        baseDelayMs: 1,
      })
    ).rejects.toThrow(HttpStatusError);

    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});
