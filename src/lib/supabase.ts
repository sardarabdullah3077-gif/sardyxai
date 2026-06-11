/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let configPromise: Promise<SupabaseClient> | null = null;
let cachedConfig: { supabaseUrl?: string; supabaseAnonKey?: string; isPlaceholder?: boolean } | null = null;

export async function getSupabaseConfig(): Promise<{ supabaseUrl?: string; supabaseAnonKey?: string; isPlaceholder: boolean }> {
  if (cachedConfig) return cachedConfig as any;
  try {
    const response = await fetch('/api/config/supabase');
    if (!response.ok) {
      return { isPlaceholder: true };
    }
    const data = await response.json();
    cachedConfig = data;
    return data;
  } catch (err) {
    console.error('Failed to resolve Supabase Config:', err);
    return { isPlaceholder: true };
  }
}

export async function getSupabase(): Promise<SupabaseClient> {
  if (supabaseInstance) return supabaseInstance;

  if (configPromise) return configPromise;

  configPromise = (async () => {
    try {
      const config = await getSupabaseConfig();
      let activeUrl = config.supabaseUrl;
      let activeKey = config.supabaseAnonKey;
      
      if (!activeUrl || !activeKey || config.isPlaceholder) {
        console.warn('Supabase lies in placeholder state. Please configure real credential keys through Settings tab.');
        activeUrl = 'https://placeholder.supabase.co';
        activeKey = 'placeholder';
      }

      supabaseInstance = createClient(activeUrl, activeKey);
      return supabaseInstance;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder');
      return supabaseInstance;
    }
  })();

  return configPromise;
}
