/**
 * Ledger-aware finance calculations for a chitfund company.
 *
 * One entrypoint per ledger type:
 *   - calcCD()   — Cash Deposit (simple daily interest + penal)
 *   - calcHP()   — Hire Purchase (flat EMI)
 *   - calcSTBD() — Short-term instalment plan (flat EMI, short tenure)
 *   - calcTBD()  — Term deposit (monthly compounding to maturity)
 *   - calcGeneric() — dispatcher by loan type
 *
 * All functions are PURE and take explicit `today` to remain testable.
 */

import type { LoanType } from '@/types'
import { getEffectiveRule, resolveRule, type LedgerOverride, type LedgerRule } from './config'
import { addDays, addMonths, diffDays, round2, toNumber } from './format'

// ────────────────────────────────────────────────────────────────
// Penalty engine — company policy
//
// From due date, customer has a grace window of `graceDays` (default 5) during
// which no penalty accrues. Once that window is exceeded, penalty is charged
// DAILY from the original due date at `penaltyDailyRate` (default 3.75/30%/day)
// on the overdue amount.
//
// Example: due April 1, today April 10 → 9 days past due.
//   - 9 > 5 grace → 9 penalty days × 0.125% × amount.

export interface PenaltyInput {
  /** Ledger code — picks up graceDays / penaltyDailyRate from settings. */
  loanType?: LoanType | string
  /** Amount on which penalty is computed (overdue principal + interest). */
  overdueAmount: number
  /** Original due date. */
  dueDate: string | Date
  /** Today's date (default: now). */
  today?: string | Date
  /** Manual override for grace days (skips config). */
  graceDays?: number
  /** Manual override for daily penal rate (% per day). */
  dailyRate?: number
}

export interface PenaltyResult {
  graceDays: number
  dailyRate: number
  daysPastDue: number
  penaltyDays: number
  penalty: number
  withinGrace: boolean
}

/** Compute penalty for an overdue amount per the 5-day grace / 3.75% daily policy. */
export function calcPenalty(input: PenaltyInput): PenaltyResult {
  const rule = input.loanType ? getEffectiveRule(input.loanType) : undefined
  const graceDays = Math.max(0, Math.round(toNumber(input.graceDays ?? rule?.graceDays ?? 5)))
  const dailyRate = toNumber(input.dailyRate ?? rule?.penaltyDailyRate ?? (3.75 / 30))
  const amount = Math.max(0, toNumber(input.overdueAmount))
  const today = input.today ?? new Date()
  const daysPastDue = Math.max(0, diffDays(input.dueDate, today))
  const withinGrace = daysPastDue <= graceDays
  const penaltyDays = withinGrace ? 0 : daysPastDue
  const penalty = round2((amount * dailyRate * penaltyDays) / 100)
  return { graceDays, dailyRate, daysPastDue, penaltyDays, penalty, withinGrace }
}

// ────────────────────────────────────────────────────────────────
// Shared types

export interface ScheduleRow {
  sn: number
  dueDate: string       // YYYY-MM-DD
  principal: number
  interest: number
  installment: number   // principal + interest
  balance: number       // outstanding after this row
  status?: 'paid' | 'due' | 'overdue' | 'upcoming'
}

export interface CommonInput {
  principal: number
  loanDate: string | Date
  /** Monthly rate as percentage (3 means 3%/month). If omitted, uses ledger default. */
  rate?: number
  /** Monthly overdue rate as percentage. */
  overdueRate?: number
  /** Today's date — defaults to now. Pass explicitly for deterministic tests / reports. */
  today?: string | Date
  override?: LedgerOverride
}

// ────────────────────────────────────────────────────────────────
// 1. CD — Cash Deposit / Simple Daily Interest
//
// Convention (chitfund standard):
//   Monthly rate R% → Daily rate = R / 30 % ≡ (R * 12) / 365 %
//   Interest = Principal * (R/100) * (days/30)
//   Penal interest accrues only on days past due date, at overdueRate.

export interface CDInput extends CommonInput {
  dueDate?: string | Date
  amountPaid?: number
}

export interface CDResult {
  rule: LedgerRule
  principal: number
  rate: number
  overdueRate: number
  periodDays: number
  overdueDays: number
  presentInterest: number
  penalty: number
  amountPaid: number
  totalBalance: number       // principal + interest − paid
  totalAmtForRenewal: number // interest + penalty − paid (principal rolls)
  totalAmtForClose: number   // principal + interest + penalty − paid
}

export function calcCD(input: CDInput): CDResult {
  const rule = resolveRule('CD', input.override)
  const principal = toNumber(input.principal)
  const rate = toNumber(input.rate ?? rule.defaultRate)
  const overdueRate = toNumber(input.overdueRate ?? rule.defaultOverdueRate)
  const amountPaid = toNumber(input.amountPaid)
  const today = input.today ?? new Date()

  const periodDays = Math.max(0, diffDays(input.loanDate, today))
  const overdueDays = input.dueDate ? Math.max(0, diffDays(input.dueDate, today)) : 0

  // Monthly-rate convention: interest per day = principal * rate% / 30
  const perDay = (principal * rate) / (100 * 30)
  const presentInterest = round2(perDay * periodDays)

  // Company policy: 5-day grace, then 3.75% / 30 daily penal. Uses ledger
  // override if admin has changed it via Settings.
  let penalty = 0
  if (input.dueDate) {
    const pen = calcPenalty({
      loanType: 'CD',
      overdueAmount: principal,
      dueDate: input.dueDate,
      today,
      dailyRate: overdueRate / 30, // expose the old monthly overdueRate as daily equivalent
    })
    penalty = pen.penalty
  }

  const totalBalance = round2(principal + presentInterest - amountPaid)
  const totalAmtForRenewal = round2(presentInterest + penalty - amountPaid)
  const totalAmtForClose = round2(principal + presentInterest + penalty - amountPaid)

  return {
    rule,
    principal: round2(principal),
    rate,
    overdueRate,
    periodDays,
    overdueDays,
    presentInterest,
    penalty,
    amountPaid: round2(amountPaid),
    totalBalance,
    totalAmtForRenewal,
    totalAmtForClose,
  }
}

// ────────────────────────────────────────────────────────────────
// 2. HP — Hire Purchase (Flat EMI)
//
// Flat interest up-front:
//   Total Interest = Principal * R% * tenureMonths
//   Total Payable  = Principal + Total Interest
//   EMI            = Total Payable / installments
//
// Schedule: equal installments, each has equal principal + equal interest.

export interface HPInput extends CommonInput {
  tenureMonths: number
  installments?: number             // defaults to tenureMonths
  installmentFrequencyDays?: number // defaults to 30
  amountPaid?: number
}

export interface HPResult {
  rule: LedgerRule
  principal: number
  rate: number
  tenureMonths: number
  totalInterest: number
  totalPayable: number
  installments: number
  emi: number
  amountPaid: number
  outstanding: number
  schedule: ScheduleRow[]
}

export function calcHP(input: HPInput): HPResult {
  const rule = resolveRule('HP', input.override)
  const principal = toNumber(input.principal)
  const rate = toNumber(input.rate ?? rule.defaultRate)
  const tenureMonths = Math.max(1, Math.round(toNumber(input.tenureMonths)))
  const installments = Math.max(1, Math.round(toNumber(input.installments ?? tenureMonths)))
  const freq = Math.max(1, Math.round(toNumber(input.installmentFrequencyDays ?? 30)))
  const amountPaid = toNumber(input.amountPaid)

  const totalInterest = round2(principal * (rate / 100) * tenureMonths)
  const totalPayable = round2(principal + totalInterest)
  const emi = round2(totalPayable / installments)
  const principalPerEmi = round2(principal / installments)
  const interestPerEmi = round2(totalInterest / installments)

  const schedule: ScheduleRow[] = []
  let balance = totalPayable
  for (let i = 1; i <= installments; i++) {
    const dueDate = addDays(input.loanDate, i * freq)
    const inst = i === installments ? round2(balance) : emi
    balance = round2(balance - inst)
    schedule.push({
      sn: i,
      dueDate: dueDate.toISOString().slice(0, 10),
      principal: principalPerEmi,
      interest: interestPerEmi,
      installment: inst,
      balance: Math.max(0, balance),
      status: 'upcoming',
    })
  }

  return {
    rule,
    principal: round2(principal),
    rate,
    tenureMonths,
    totalInterest,
    totalPayable,
    installments,
    emi,
    amountPaid: round2(amountPaid),
    outstanding: round2(Math.max(0, totalPayable - amountPaid)),
    schedule,
  }
}

// ────────────────────────────────────────────────────────────────
// 3. STBD — Short-Term Instalment Plan
//
// Similar math to HP but presented as daily/weekly instalments of a fixed
// total amount. Late-fee computed per-instalment at overdueRate % / month.

export interface STBDInput extends CommonInput {
  totalInstallments: number
  installmentAmount?: number       // if provided, drives total
  installmentFrequencyDays?: number // 1=daily, 7=weekly, 30=monthly. Default 1.
  amountPaid?: number
}

export interface STBDResult {
  rule: LedgerRule
  principal: number
  rate: number
  totalInstallments: number
  installmentAmount: number
  totalAmount: number
  totalInterest: number
  lateFees: number
  amountPaid: number
  dueAmount: number
  totalPayable: number
  schedule: ScheduleRow[]
}

export function calcSTBD(input: STBDInput): STBDResult {
  const rule = resolveRule('STBD', input.override)
  const principal = toNumber(input.principal)
  const rate = toNumber(input.rate ?? rule.defaultRate)
  const n = Math.max(1, Math.round(toNumber(input.totalInstallments)))
  const freq = Math.max(1, Math.round(toNumber(input.installmentFrequencyDays ?? 1)))
  const amountPaid = toNumber(input.amountPaid)
  const today = input.today ?? new Date()

  // Total interest: flat, based on principal, rate (%/month), and tenure in months.
  const tenureMonths = (n * freq) / 30
  const totalInterest = round2(principal * (rate / 100) * tenureMonths)
  const totalAmount = round2(principal + totalInterest)
  const installmentAmount = round2(
    toNumber(input.installmentAmount) > 0 ? toNumber(input.installmentAmount) : totalAmount / n
  )

  // Schedule
  const schedule: ScheduleRow[] = []
  const principalPer = round2(principal / n)
  const interestPer = round2(totalInterest / n)
  let runningPaid = amountPaid
  let balance = totalAmount
  for (let i = 1; i <= n; i++) {
    const dueDate = addDays(input.loanDate, i * freq)
    balance = round2(balance - installmentAmount)
    const paidThis = Math.min(runningPaid, installmentAmount)
    runningPaid = round2(runningPaid - paidThis)
    const status: ScheduleRow['status'] =
      paidThis >= installmentAmount ? 'paid' : diffDays(dueDate, today) > 0 ? 'overdue' : diffDays(dueDate, today) === 0 ? 'due' : 'upcoming'
    schedule.push({
      sn: i,
      dueDate: dueDate.toISOString().slice(0, 10),
      principal: principalPer,
      interest: interestPer,
      installment: installmentAmount,
      balance: Math.max(0, balance),
      status,
    })
  }

  // Late fees: 5-day grace + 3.75%/30 daily penal on each overdue installment.
  const overdueRate = toNumber(input.overdueRate ?? rule.defaultOverdueRate)
  let lateFees = 0
  for (const row of schedule) {
    if (row.status === 'overdue') {
      const pen = calcPenalty({
        loanType: 'STBD',
        overdueAmount: row.installment,
        dueDate: row.dueDate,
        today,
        dailyRate: overdueRate / 30,
      })
      lateFees += pen.penalty
    }
  }
  lateFees = round2(lateFees)

  const dueAmount = round2(Math.max(0, totalAmount - amountPaid))

  return {
    rule,
    principal: round2(principal),
    rate,
    totalInstallments: n,
    installmentAmount,
    totalAmount,
    totalInterest,
    lateFees,
    amountPaid: round2(amountPaid),
    dueAmount,
    totalPayable: round2(dueAmount + lateFees),
    schedule,
  }
}

// ────────────────────────────────────────────────────────────────
// 4. TBD — Term Deposit (Monthly Compounding)
//
//   maturity = principal * (1 + rate/100)^months
//   premium (earned so far) = principal * (1 + rate/100)^elapsedMonths − principal

export interface TBDInput extends CommonInput {
  tenureMonths: number
  amountPaid?: number
}

export interface TBDResult {
  rule: LedgerRule
  principal: number
  rate: number
  tenureMonths: number
  elapsedMonths: number
  remainingMonths: number
  premium: number       // accrued interest so far
  maturityAmount: number
  dueAmount: number     // what customer will receive at maturity, net of paid
  paidAmount: number
  dueDate: string
}

export function calcTBD(input: TBDInput): TBDResult {
  const rule = resolveRule('TBD', input.override)
  const principal = toNumber(input.principal)
  const rate = toNumber(input.rate ?? rule.defaultRate)
  const n = Math.max(1, Math.round(toNumber(input.tenureMonths)))
  const paid = toNumber(input.amountPaid)
  const today = input.today ?? new Date()

  const r = rate / 100
  const maturityAmount = round2(principal * Math.pow(1 + r, n))
  const dueDate = addMonths(input.loanDate, n)

  const totalDays = diffDays(input.loanDate, dueDate)
  const elapsedDays = Math.max(0, Math.min(totalDays, diffDays(input.loanDate, today)))
  const elapsedMonths = round2(elapsedDays / 30)
  const remainingMonths = round2(Math.max(0, n - elapsedMonths))

  const accrued = round2(principal * Math.pow(1 + r, elapsedMonths) - principal)
  const dueAmount = round2(Math.max(0, maturityAmount - paid))

  return {
    rule,
    principal: round2(principal),
    rate,
    tenureMonths: n,
    elapsedMonths,
    remainingMonths,
    premium: accrued,
    maturityAmount,
    dueAmount,
    paidAmount: round2(paid),
    dueDate: dueDate.toISOString().slice(0, 10),
  }
}

// ────────────────────────────────────────────────────────────────
// Dispatcher

export type AnyResult = CDResult | HPResult | STBDResult | TBDResult

export function calcGeneric(
  loanType: LoanType,
  input: CDInput & HPInput & STBDInput & TBDInput
): AnyResult {
  switch (loanType) {
    case 'CD':
    case 'OD':
      return calcCD(input)
    case 'HP':
      return calcHP({ ...input, tenureMonths: input.tenureMonths ?? 12 })
    case 'STBD':
      return calcSTBD({ ...input, totalInstallments: input.totalInstallments ?? 100 })
    case 'TBD':
    case 'FD':
    case 'RD':
      return calcTBD({ ...input, tenureMonths: input.tenureMonths ?? 12 })
    default:
      return calcCD(input)
  }
}
