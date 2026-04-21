/**
 * /api/settings/ledgers
 *
 * GET  — returns all saved ledger overrides (rate, overdueRate, method, etc).
 * PUT  — replaces the full overrides map.
 *
 * Storage: Supabase table `ledger_settings` with columns:
 *   code TEXT PRIMARY KEY,
 *   rate NUMERIC,
 *   overdue_rate NUMERIC,
 *   method TEXT,
 *   days_per_year INTEGER,
 *   principal_rolls_on_renewal BOOLEAN,
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 *
 * Graceful fallback: if the table is missing, both endpoints return OK with
 * empty data — the UI still works via client-side localStorage cache.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import type { LoanType } from '@/types'
import type { LedgerOverride, InterestMethod } from '@/lib/finance'

const TABLE = 'ledger_settings'

interface LedgerSettingRow {
  code: string
  rate: number | null
  overdue_rate: number | null
  method: string | null
  days_per_year: number | null
  principal_rolls_on_renewal: boolean | null
}

function rowToOverride(row: LedgerSettingRow): LedgerOverride {
  return {
    rate: row.rate ?? undefined,
    overdueRate: row.overdue_rate ?? undefined,
    method: (row.method as InterestMethod) ?? undefined,
    daysPerYear: (row.days_per_year as 365 | 360) ?? undefined,
    principalRollsOnRenewal: row.principal_rolls_on_renewal ?? undefined,
  }
}

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({})

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from(TABLE).select('*')

    if (error) {
      // Table missing or RLS — fall back to empty (UI still works via cache).
      console.warn('[settings/ledgers] GET fallback:', error.message)
      return NextResponse.json({})
    }

    const out: Partial<Record<LoanType, LedgerOverride>> = {}
    for (const row of (data || []) as LedgerSettingRow[]) {
      out[row.code as LoanType] = rowToOverride(row)
    }
    return NextResponse.json(out)
  } catch (e: any) {
    console.warn('[settings/ledgers] GET error:', e?.message)
    return NextResponse.json({})
  }
}

export async function PUT(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    // Caller should still persist locally; signal "not persisted".
    return NextResponse.json({ ok: true, persisted: false })
  }

  let body: Partial<Record<LoanType, LedgerOverride>> = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Expected object of overrides keyed by ledger code' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseClient()
    const rows: LedgerSettingRow[] = Object.entries(body).map(([code, o]) => ({
      code,
      rate: o?.rate ?? null,
      overdue_rate: o?.overdueRate ?? null,
      method: o?.method ?? null,
      days_per_year: o?.daysPerYear ?? null,
      principal_rolls_on_renewal: o?.principalRollsOnRenewal ?? null,
    }))

    if (rows.length === 0) return NextResponse.json({ ok: true, persisted: true })

    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'code' })
    if (error) {
      console.warn('[settings/ledgers] PUT fallback:', error.message)
      return NextResponse.json({ ok: true, persisted: false, warning: error.message })
    }
    return NextResponse.json({ ok: true, persisted: true })
  } catch (e: any) {
    console.warn('[settings/ledgers] PUT error:', e?.message)
    return NextResponse.json({ ok: true, persisted: false, warning: e?.message })
  }
}
