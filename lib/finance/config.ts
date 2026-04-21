/**
 * Per-ledger interest configuration.
 *
 * This is the SINGLE SOURCE OF TRUTH for interest rules across all ledgers.
 * To change custom interest settings per ledger later, edit only this file —
 * every ledger page, report, and calculator reads from it.
 *
 * All rates are percentages (3 means 3%), not decimal fractions.
 */

import type { LoanType } from '@/types'

export type InterestMethod =
  | 'simple_daily'     // Simple interest, daily accrual — CD, OD
  | 'flat_emi'         // Flat interest spread across equal installments — HP, STBD
  | 'compound_monthly' // Compound interest, monthly — TBD, FD, RD
  | 'simple_monthly'   // Simple interest, monthly rests

export interface LedgerRule {
  label: string
  code: LoanType
  /** How interest is computed for this ledger type. */
  method: InterestMethod
  /** Default nominal interest rate (% per month for chitfund convention). */
  defaultRate: number
  /** Year basis for converting monthly rate to daily where needed. */
  daysPerYear: 365 | 360
  /** Default penal (overdue) rate (% per month). */
  defaultOverdueRate: number
  /** Grace period after due date (days) before penalty kicks in. Default 5. */
  graceDays: number
  /** Daily penalty rate (% per day) applied after grace window. Default 3.75/30. */
  penaltyDailyRate: number
  /** Does this ledger include principal when renewing (rollover)? */
  principalRollsOnRenewal: boolean
  /** Short description shown in UI. */
  description: string
}

/** Company-wide defaults — chitfund policy (5-day grace, 3.75% monthly penal). */
export const GLOBAL_POLICY = {
  /** Base default interest rate across all ledgers (% per month). */
  DEFAULT_RATE: 3,
  /** Grace days before penalty applies after due date. */
  GRACE_DAYS: 5,
  /** Penal interest rate (% per month) — translated to daily for 5+day breaches. */
  PENAL_RATE_MONTHLY: 3.75,
} as const

/**
 * Chitfund conventions:
 *  - Rates are quoted MONTHLY in customer-facing UI (e.g. 3% means 3% per month).
 *  - CD/OD: simple interest accrued daily, principal stays flat until close/renew.
 *  - HP: flat-rate EMI — (P*R*N) upfront interest, divided across installments.
 *  - STBD: short-term recurring deposit / instalment plan, flat interest.
 *  - TBD: term balance deposit, interest compounded monthly to maturity.
 *  - FD: fixed deposit, compounded monthly.
 *  - RD: recurring deposit, compounded monthly on each instalment.
 */
const commonPolicy = {
  graceDays: GLOBAL_POLICY.GRACE_DAYS,
  penaltyDailyRate: GLOBAL_POLICY.PENAL_RATE_MONTHLY / 30,
}

export const LEDGER_RULES: Record<LoanType, LedgerRule> = {
  CD: {
    label: 'Cash Deposit (CD)',
    code: 'CD',
    method: 'simple_daily',
    defaultRate: GLOBAL_POLICY.DEFAULT_RATE,
    daysPerYear: 365,
    defaultOverdueRate: GLOBAL_POLICY.PENAL_RATE_MONTHLY,
    ...commonPolicy,
    principalRollsOnRenewal: true,
    description: 'Simple interest, daily accrual. Principal rolls on renewal.',
  },
  HP: {
    label: 'Hire Purchase (HP)',
    code: 'HP',
    method: 'flat_emi',
    defaultRate: GLOBAL_POLICY.DEFAULT_RATE,
    daysPerYear: 365,
    defaultOverdueRate: GLOBAL_POLICY.PENAL_RATE_MONTHLY,
    ...commonPolicy,
    principalRollsOnRenewal: false,
    description: 'Flat interest EMI. Fixed tenure. No rollover.',
  },
  STBD: {
    label: 'Short Term Balance Deposit (STBD)',
    code: 'STBD',
    method: 'flat_emi',
    defaultRate: GLOBAL_POLICY.DEFAULT_RATE,
    daysPerYear: 365,
    defaultOverdueRate: GLOBAL_POLICY.PENAL_RATE_MONTHLY,
    ...commonPolicy,
    principalRollsOnRenewal: false,
    description: 'Short-term instalment plan. Flat interest.',
  },
  TBD: {
    label: 'Term Balance Deposit (TBD)',
    code: 'TBD',
    method: 'compound_monthly',
    defaultRate: GLOBAL_POLICY.DEFAULT_RATE,
    daysPerYear: 365,
    defaultOverdueRate: GLOBAL_POLICY.PENAL_RATE_MONTHLY,
    ...commonPolicy,
    principalRollsOnRenewal: false,
    description: 'Term deposit. Interest compounded monthly to maturity.',
  },
  FD: {
    label: 'Fixed Deposit (FD)',
    code: 'FD',
    method: 'compound_monthly',
    defaultRate: GLOBAL_POLICY.DEFAULT_RATE,
    daysPerYear: 365,
    defaultOverdueRate: GLOBAL_POLICY.PENAL_RATE_MONTHLY,
    ...commonPolicy,
    principalRollsOnRenewal: false,
    description: 'Fixed deposit. Monthly compounding.',
  },
  OD: {
    label: 'Overdraft (OD)',
    code: 'OD',
    method: 'simple_daily',
    defaultRate: GLOBAL_POLICY.DEFAULT_RATE,
    daysPerYear: 365,
    defaultOverdueRate: GLOBAL_POLICY.PENAL_RATE_MONTHLY,
    ...commonPolicy,
    principalRollsOnRenewal: true,
    description: 'Overdraft. Simple daily interest on outstanding.',
  },
  RD: {
    label: 'Recurring Deposit (RD)',
    code: 'RD',
    method: 'compound_monthly',
    defaultRate: GLOBAL_POLICY.DEFAULT_RATE,
    daysPerYear: 365,
    defaultOverdueRate: GLOBAL_POLICY.PENAL_RATE_MONTHLY,
    ...commonPolicy,
    principalRollsOnRenewal: false,
    description: 'Recurring deposit. Monthly compounding per instalment.',
  },
}

/** Returns the rule for a ledger, falling back to CD if unknown. */
export function getLedgerRule(code: LoanType | string | undefined): LedgerRule {
  if (!code) return LEDGER_RULES.CD
  return (LEDGER_RULES as any)[code] ?? LEDGER_RULES.CD
}

/** Per-account / global override hook — powers the Settings → Ledgers UI. */
export interface LedgerOverride {
  rate?: number
  overdueRate?: number
  method?: InterestMethod
  daysPerYear?: 365 | 360
  graceDays?: number
  penaltyDailyRate?: number
  principalRollsOnRenewal?: boolean
}

export function resolveRule(code: LoanType | string | undefined, override?: LedgerOverride): LedgerRule {
  const base = getLedgerRule(code)
  if (!override) return base
  return {
    ...base,
    defaultRate: override.rate ?? base.defaultRate,
    defaultOverdueRate: override.overdueRate ?? base.defaultOverdueRate,
    method: override.method ?? base.method,
    daysPerYear: override.daysPerYear ?? base.daysPerYear,
    graceDays: override.graceDays ?? base.graceDays,
    penaltyDailyRate: override.penaltyDailyRate ?? base.penaltyDailyRate,
    principalRollsOnRenewal: override.principalRollsOnRenewal ?? base.principalRollsOnRenewal,
  }
}

// ────────────────────────────────────────────────────────────────
// Global overrides store (edited via Settings → Ledgers).
//
// Strategy: the UI reads/writes a flat map `Record<LoanType, LedgerOverride>`
// via /api/settings/ledgers. On the client we cache it in a module-level
// variable + localStorage so every ledger page, report, and calculator
// picks up the latest settings immediately after save — no refresh needed.

const STORAGE_KEY = 'ledger_overrides_v1'
let globalOverrides: Partial<Record<LoanType, LedgerOverride>> = {}
const subscribers = new Set<() => void>()

/** True if running in a browser (so we can touch localStorage). */
const canUseBrowserStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

/** Hydrate from localStorage on first use — called lazily by getEffectiveRule. */
function hydrateOverrides(): void {
  if (!canUseBrowserStorage()) return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      globalOverrides = parsed
    }
  } catch {
    // ignore malformed cache
  }
}

let hydrated = false
function ensureHydrated(): void {
  if (hydrated) return
  hydrated = true
  hydrateOverrides()
}

/** Returns the effective rule for a ledger — base config merged with any global override. */
export function getEffectiveRule(code: LoanType | string | undefined): LedgerRule {
  ensureHydrated()
  if (!code) return LEDGER_RULES.CD
  const base = getLedgerRule(code)
  const override = globalOverrides[code as LoanType]
  return override ? resolveRule(code, override) : base
}

/** Returns a snapshot of the currently-loaded overrides (read-only). */
export function getAllOverrides(): Partial<Record<LoanType, LedgerOverride>> {
  ensureHydrated()
  return { ...globalOverrides }
}

/** Replaces the in-memory overrides map and mirrors it to localStorage. */
export function setAllOverrides(next: Partial<Record<LoanType, LedgerOverride>>): void {
  globalOverrides = { ...next }
  if (canUseBrowserStorage()) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(globalOverrides)) } catch {}
  }
  subscribers.forEach(fn => { try { fn() } catch {} })
}

/** Subscribe to override changes — useful inside React components. */
export function subscribeOverrides(fn: () => void): () => void {
  subscribers.add(fn)
  return () => { subscribers.delete(fn) }
}
