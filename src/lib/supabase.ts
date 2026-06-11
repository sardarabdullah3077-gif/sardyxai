/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let configPromise: Promise<SupabaseClient> | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
  if (supabaseInstance) return supabaseInstance;

  if (configPromise) return configPromise;

  configPromise = (async () => {
    try {
      const response = await fetch('/api/config/supabase');
      if (!response.ok) {
        throw new Error('Supabase client-side settings missing or backend offline.');
      }
      const data = await response.json();
      const { supabaseUrl, supabaseAnonKey } = data;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase URL or Anon Key is empty in configuration response.');
      }

      supabaseInstance = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
      return supabaseInstance;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      // Fallback placeholder client to prevent application lockup
      supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder');
      return supabaseInstance;
    }
  })();

  return configPromise;
}
