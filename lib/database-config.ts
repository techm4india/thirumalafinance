/**
 * Single source of truth for whether the app can talk to Supabase.
 * No placeholder URLs — if this is false, API routes must not pretend data exists.
 */
export function isDatabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  return !!(url && key)
}

/** Shown in API JSON and UI when env is missing */
export const DATABASE_ENV_MESSAGE =
  'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (then restart `npm run dev`) or in your production host environment variables.'
