// Server-only Supabase client — no placeholder project; misconfiguration fails fast.
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { isDatabaseConfigured, DATABASE_ENV_MESSAGE } from './database-config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

export function isSupabaseConfigured(): boolean {
  return isDatabaseConfigured()
}

let supabaseInstance: SupabaseClient | null = null

function initializeSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  if (!isDatabaseConfigured()) {
    throw new Error('Supabase is not configured. ' + DATABASE_ENV_MESSAGE)
  }

  try {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!)
    return supabaseInstance
  } catch (error) {
    console.error('Error initializing Supabase client:', error)
    throw error instanceof Error ? error : new Error(String(error))
  }
}

export function getSupabaseClient(): SupabaseClient {
  return initializeSupabase()
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = initializeSupabase()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
