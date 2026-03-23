import Constants from 'expo-constants';

const DEFAULT_API_PORT = '3001';
const DEFAULT_API_URL = `http://localhost:${DEFAULT_API_PORT}`;

let workingApiBaseUrl: string | null = null;
let workingGoogleAuthBaseUrl: string | null = null;

function normalizeBaseUrl(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
}

function getHostname(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function isPrivateHost(hostname: string | null): boolean {
  if (!hostname) {
    return false;
  }

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

function getExpoHostApiUrl(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    null;

  if (!hostUri) {
    return null;
  }

  const host = hostUri.split(':')[0];
  if (!host) {
    return null;
  }

  return `http://${host}:${DEFAULT_API_PORT}`;
}

function uniqueUrls(values: Array<string | null | undefined>): string[] {
  const urls = values.filter((value): value is string => Boolean(value));
  return Array.from(new Set(urls));
}

function orderConfiguredAndDerived(
  configuredUrl: string | null,
  derivedUrl: string | null,
): Array<string | null> {
  const configuredHost = getHostname(configuredUrl);
  const derivedHost = getHostname(derivedUrl);

  if (
    __DEV__ &&
    configuredUrl &&
    derivedUrl &&
    configuredHost &&
    derivedHost &&
    configuredHost !== derivedHost &&
    isPrivateHost(configuredHost) &&
    isPrivateHost(derivedHost)
  ) {
    // In Expo Go, prefer the current Metro host over a stale LAN IP in .env.
    return [derivedUrl, configuredUrl];
  }

  return [configuredUrl, derivedUrl];
}

export function joinApiUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path}`;
}

export function getApiBaseCandidates(): string[] {
  const configuredUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL) ?? DEFAULT_API_URL;
  const derivedUrl = __DEV__ ? getExpoHostApiUrl() : null;

  return uniqueUrls([
    workingApiBaseUrl,
    ...orderConfiguredAndDerived(configuredUrl, derivedUrl),
    DEFAULT_API_URL,
  ]);
}

export function rememberWorkingApiBaseUrl(baseUrl: string): void {
  workingApiBaseUrl = normalizeBaseUrl(baseUrl);
}

export function getGoogleAuthBaseCandidates(): string[] {
  const configuredUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_GOOGLE_AUTH_URL);
  return uniqueUrls([
    workingGoogleAuthBaseUrl,
    configuredUrl,
    ...getApiBaseCandidates(),
  ]);
}

export function rememberWorkingGoogleAuthBaseUrl(baseUrl: string): void {
  workingGoogleAuthBaseUrl = normalizeBaseUrl(baseUrl);
}
