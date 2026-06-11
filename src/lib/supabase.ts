/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @deprecated Supabase integration has been removed.
 * Using local email/password authentication instead.
 * This file is kept for backwards compatibility but should not be used.
 */

// Placeholder functions - no longer functional
export async function getSupabaseConfig() {
  return { isPlaceholder: true };
}

export async function getSupabase() {
  throw new Error('Supabase has been deprecated. Use local email/password authentication instead.');
}
