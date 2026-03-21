import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

function inferSupabaseUrl(): string {
  const configuredUrl = process.env.SUPABASE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
  if (!databaseUrl) {
    return '';
  }

  try {
    const parsed = new URL(databaseUrl);
    const projectRefFromUsername = parsed.username.split('.')[1];
    if (projectRefFromUsername) {
      return `https://${projectRefFromUsername}.supabase.co`;
    }

    const hostMatch = parsed.hostname.match(/^(?:db\.)?([a-z0-9-]+)\.supabase\.co$/i);
    const projectRef = hostMatch?.[1];
    return projectRef ? `https://${projectRef}.supabase.co` : '';
  } catch {
    return '';
  }
}

const SUPABASE_URL = inferSupabaseUrl();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseAdmin: SupabaseClient | null = null;

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (!isSupabaseStorageConfigured()) {
    throw new Error(
      'Image uploads are not configured. Set SUPABASE_SERVICE_ROLE_KEY in server/.env to enable backend uploads.',
    );
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdmin;
}
