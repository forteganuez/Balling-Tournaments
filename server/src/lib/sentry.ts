import { logger } from './logger.js';

const SENTRY_DSN = process.env.SENTRY_DSN?.trim() || '';

let sentryModulePromise: Promise<typeof import('@sentry/node') | null> | null = null;

function getNodeMajorVersion() {
  const [major] = process.versions.node.split('.');
  return Number(major) || 0;
}

function shouldUseSentry() {
  return Boolean(SENTRY_DSN) && getNodeMajorVersion() < 25;
}

async function loadSentry() {
  if (!shouldUseSentry()) {
    return null;
  }

  if (!sentryModulePromise) {
    sentryModulePromise = import('@sentry/node').catch((error) => {
      logger.warn('Sentry import failed; continuing without Sentry', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    });
  }

  return sentryModulePromise;
}

export async function initSentry() {
  const Sentry = await loadSentry();
  if (!Sentry) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.2,
  });
}

export function captureSentryException(error: unknown) {
  if (!shouldUseSentry()) {
    return;
  }

  void loadSentry().then((Sentry) => {
    Sentry?.captureException(error);
  });
}
