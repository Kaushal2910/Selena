import { addBreadcrumb } from '@/services/telemetry';
import * as Network from 'expo-network';

export class OfflineError extends Error {
  constructor(message = 'No active network connection detected.') {
    super(message);
    this.name = 'OfflineError';
  }
}

export class HttpStatusError extends Error {
  public readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Request failed with HTTP status ${status}`);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

export interface RetryRequestOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  onAttempt?: (attempt: number, detail: string) => void;
}

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);
const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 403, 404, 422]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoffWithJitter(
  attempt: number,
  baseDelayMs: number
): number {
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * baseDelayMs);
  return exponential + jitter;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof OfflineError) {
    return false;
  }
  if (error instanceof HttpStatusError) {
    if (NON_RETRYABLE_STATUS_CODES.has(error.status)) {
      return false;
    }
    return RETRYABLE_STATUS_CODES.has(error.status);
  }
  if (error instanceof Error) {
    // AbortError (timeout) or TypeError (fetch network/socket failure)
    return error.name === 'AbortError' || error.name === 'TypeError';
  }
  return false;
}

export async function requestWithRetry<T>(
  url: string,
  options: RetryRequestOptions = {}
): Promise<T> {
  const {
    timeoutMs = 8000,
    maxRetries = 2,
    baseDelayMs = 400,
    onAttempt,
    signal: externalSignal,
    ...fetchOptions
  } = options;

  const networkState = await Network.getNetworkStateAsync();
  if (networkState.isConnected === false) {
    throw new OfflineError();
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        throw new DOMException('Aborted', 'AbortError');
      }
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      onAttempt?.(
        attempt + 1,
        `Dispatching request (timeout ${timeoutMs}ms)...`
      );
      addBreadcrumb('http', `Attempt ${attempt + 1} -> ${url}`);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new HttpStatusError(response.status);
      }

      const data = (await response.json()) as T;
      return data;
    } catch (err) {
      lastError = err;

      if (attempt === maxRetries || !isRetryableError(err)) {
        throw err;
      }

      const delayMs = computeBackoffWithJitter(attempt, baseDelayMs);
      const reason =
        err instanceof Error && err.name === 'AbortError'
          ? `Timed out after ${timeoutMs}ms`
          : err instanceof Error
            ? err.message
            : 'Transient fault';

      onAttempt?.(
        attempt + 1,
        `${reason}. Backing off ${delayMs}ms before retry ${attempt + 2}...`
      );
      await sleep(delayMs);
    } finally {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }
  }

  throw lastError;
}
