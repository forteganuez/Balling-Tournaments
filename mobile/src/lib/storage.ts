import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredValue(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function setStoredValue(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function clearStoredValue(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
