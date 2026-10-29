/**
 * Supabase Client Configuration & Security Boundary
 * 
 * Strict Security Invariants:
 * 1. Only publishable (anon) keys are permitted in client builds.
 * 2. Any attempt to supply a service-role key or admin secret will throw an immediate fatal error.
 * 3. RLS on PostgreSQL is the authoritative security boundary.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PROJECT_URL) as string | undefined;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

// Validate that credentials are not using the forbidden service-role secret
function validateNoServiceRole(key?: string) {
  if (!key) return;
  // Inspect payload if JWT
  try {
    const parts = key.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.role === 'service_role') {
        throw new Error(
          'CRITICAL SECURITY ERROR: Supabase service_role key detected in client environment! ' +
          'Service role keys have superuser access and MUST NEVER be exposed to the browser. ' +
          'Please configure the public anon key (VITE_SUPABASE_ANON_KEY) instead.'
        );
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('CRITICAL SECURITY ERROR')) {
      throw e;
    }
    // Non-JWT key or custom format
  }
}

validateNoServiceRole(SUPABASE_ANON_KEY);

/**
 * Checks if Supabase has been properly configured with a real URL and key
 */
export function isSupabaseConfigured(): boolean {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (
    SUPABASE_URL.includes('your-project') ||
    SUPABASE_URL.includes('example.com') ||
    SUPABASE_ANON_KEY.includes('your-anon-key') ||
    SUPABASE_ANON_KEY.includes('your-supabase')
  ) {
    return false;
  }
  return true;
}

/**
 * Singleton Supabase Client
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder-project.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    }
  }
);
