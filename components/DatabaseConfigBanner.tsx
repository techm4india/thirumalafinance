import { isDatabaseConfigured, DATABASE_ENV_MESSAGE } from '@/lib/database-config'

/** Shown app-wide when Supabase env vars are missing — avoids silent “empty” screens. */
export function DatabaseConfigBanner() {
  if (isDatabaseConfigured()) {
    return null
  }

  return (
    <div
      role="alert"
      className="border-b border-amber-600 bg-amber-100 px-4 py-3 text-sm text-amber-950"
    >
      <strong className="font-semibold">Database not configured.</strong>{' '}
      {DATABASE_ENV_MESSAGE}
    </div>
  )
}
