import * as SecureStore from 'expo-secure-store';

export interface TokenCache {
  getToken: (key: string) => Promise<string | null>;
  saveToken: (key: string, token: string) => Promise<void>;
  clearToken?: (key: string) => Promise<void>;
}

export const CLERK_SESSION_KEY = '__clerk_client_jwt';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export async function getSecureToken(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
  } catch {
    // Self-heal corrupted keystore entries instead of crashing at boot
    try {
      await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
    } catch {
      // Ignore secondary cleanup errors
    }
    return null;
  }
}

export async function saveSecureToken(
  key: string,
  value: string
): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
  } catch {
    // Fail gracefully without logging sensitive token payloads
  }
}

export async function clearSecureToken(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
  } catch {
    // Ignore cleanup errors during sign-out
  }
}

export async function hasPersistedSessionToken(): Promise<boolean> {
  const token = await getSecureToken(CLERK_SESSION_KEY);
  return typeof token === 'string' && token.length > 0;
}

export const tokenCache: TokenCache = {
  getToken: getSecureToken,
  saveToken: saveSecureToken,
  clearToken: clearSecureToken,
};
