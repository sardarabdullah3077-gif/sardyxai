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

      let activeUrl = supabaseUrl;
      let activeKey = supabaseAnonKey;
      if (!activeUrl || !activeKey || activeUrl.includes('your-project')) {
        console.warn('Supabase lies in placeholder state. Please configure real credential keys through Settings tab.');
        activeUrl = 'https://placeholder.supabase.co';
        activeKey = 'placeholder';
      }

      supabaseInstance = createClient(activeUrl, activeKey);
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
