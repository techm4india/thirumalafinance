import { NextRequest, NextResponse } from 'next/server'
import { getLoans, saveLoan, saveTransaction } from '@/lib/data'
import { calcCD } from '@/lib/finance'
import type { Transaction } from '@/types'

function allocatePayment(amount: number, penalty: number, interest: number, principal: number) {
  const penaltyPaid = Math.min(Math.max(0, amount), Math.max(0, penalty))
  const afterPenalty = Math.max(0, amount - penaltyPaid)
  const interestPaid = Math.min(afterPenalty, Math.max(0, interest))
  const afterInterest = Math.max(0, afterPenalty - interestPaid)
  const principalPaid = Math.min(afterInterest, Math.max(0, principal))
  return { penaltyPaid, interestPaid, principalPaid }
}

/**
 * POST /api/loans/:id/renew
 * Body: { mode: 'full' | 'partial' | 'close', interest: number, penalty: number, daysRenewed: number, amountPaid?: number, postDate?: string }
 *
 * Mirrors the Access "Renewal Account" workflow:
 *   - Credits CD COMMISSION A/C with the interest component
 *   - Credits PENALTY CD A/C with the penalty component (if > 0)
 *   - Both rows carry the loan number as RNO and a "<N> Days Renewed" particular
 *
 * Payments are applied penalty first, then interest, then principal. Any unpaid
 * renewal balance is rolled into principal; any excess over renewal reduces
 * principal. Closing pays renewal + all principal and marks the loan closed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const allLoans = await getLoans()
    const loan = allLoans.find(l => l.id === params.id)
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })

    const today = new Date()
    // Admin can override the posting date (used for old-data migration so
    // historical renewal rows post under the correct date in the ledger).
    const postDate = typeof body.postDate === 'string' && body.postDate
      ? body.postDate.slice(0, 10)
      : today.toISOString().slice(0, 10)
    const dateStr = postDate

    // Recompute defensively from current loan state to guard against stale payloads.
    const fresh = calcCD({
      principal: Number(loan.loanAmount) || 0,
      loanDate: loan.date,
      rate: Number(loan.rateOfInterest) || undefined,
      today,
    })

    const interest = Number(body.interest ?? fresh.presentInterest) || 0
    const penalty = Number(body.penalty ?? fresh.penalty) || 0
    const daysRenewed = Number(body.daysRenewed ?? fresh.periodDays) || 0
    const mode = (body.mode === 'close' || body.mode === 'partial' || body.mode === 'full')
      ? body.mode as 'full' | 'partial' | 'close'
      : (body.partial ? 'partial' : 'full')
    const partial = mode === 'partial'
    const amountPaid = Number(body.amountPaid) || 0
    const loanRef = `${loan.loanType}-${loan.number}`
    const particular = mode === 'close'
      ? `${daysRenewed} Days Closed`
      : `${daysRenewed} Days Renewed${partial ? ' (Partial)' : ''}`
    const userName = (body.userName as string) || 'ADMIN'
    const principal = Number(loan.loanAmount) || 0
    const renewalDue = Math.max(0, interest + penalty)
    const closeDue = renewalDue + principal

    if (amountPaid <= 0) {
      return NextResponse.json({ error: 'Payment amount is required' }, { status: 400 })
    }
    if (mode === 'full' && Math.abs(amountPaid - renewalDue) > 0.01) {
      return NextResponse.json({ error: 'Full renewal amount must match interest + penalty' }, { status: 400 })
    }
    if (mode === 'close' && Math.abs(amountPaid - closeDue) > 0.01) {
      return NextResponse.json({ error: 'Closing amount must match principal + interest + penalty' }, { status: 400 })
    }
    if (mode === 'partial' && amountPaid > closeDue) {
      return NextResponse.json({ error: 'Payment cannot exceed closing amount' }, { status: 400 })
    }

    // Payment deduction order for every mode:
    // 1) penalty, 2) interest, 3) principal / loan amount.
    const allocation = allocatePayment(amountPaid, penalty, interest, principal)
    const penaltyPaid = allocation.penaltyPaid
    const interestPaid = allocation.interestPaid
    const principalPaid = mode === 'close' ? principal : allocation.principalPaid
    const unpaidRenewal = mode === 'close' ? 0 : Math.max(0, renewalDue - amountPaid)
    const newPrincipal = mode === 'close'
      ? 0
      : Math.max(0, principal + unpaidRenewal - principalPaid)

    const posts: Transaction[] = []

    // 1. CD COMMISSION A/C — interest credited (company income)
    if (interest > 0) {
      posts.push({
        date: dateStr,
        accountName: 'CD COMMISSION A/C',
        particulars: particular,
        rno: loanRef,
        number: String(loan.number),
        credit: interest,
        debit: 0,
        userName,
        entryTime: today.toISOString(),
        transactionType: 'loan_renewal',
      })
    }

    // 2. PENALTY CD A/C — penalty credited (company income)
    if (penalty > 0) {
      posts.push({
        date: dateStr,
        accountName: 'PENALTY CD A/C',
        particulars: particular,
        rno: loanRef,
        number: String(loan.number),
        credit: penalty,
        debit: 0,
        userName,
        entryTime: today.toISOString(),
        transactionType: 'loan_renewal',
      })
    }

    // 3. Cash receipt from customer.
    if (amountPaid > 0) {
      posts.push({
        date: dateStr,
        accountName: 'CASH A/C',
        particulars: `${particular} - cash received`,
        rno: loanRef,
        number: String(loan.number),
        credit: 0,
        debit: amountPaid,
        userName,
        entryTime: today.toISOString(),
        transactionType: 'loan_renewal',
      })
    }

    // 4. Principal reduced after penalty and interest are fully covered.
    if (principalPaid > 0) {
      posts.push({
        date: dateStr,
        accountName: `${loan.loanType} A/C`,
        particulars: mode === 'close' ? `${particular} - principal closed` : `${particular} - principal reduced`,
        rno: loanRef,
        number: String(loan.number),
        credit: principalPaid,
        debit: 0,
        userName,
        entryTime: today.toISOString(),
        transactionType: 'loan_renewal',
      })
    }

    // 5. If customer pays less than renewal amount, unpaid interest/penalty
    // becomes part of the renewed principal.
    if (unpaidRenewal > 0) {
      posts.push({
        date: dateStr,
        accountName: `${loan.loanType} A/C`,
        particulars: `${particular} - unpaid renewal added to principal`,
        rno: loanRef,
        number: String(loan.number),
        credit: 0,
        debit: unpaidRenewal,
        userName,
        entryTime: today.toISOString(),
        transactionType: 'loan_renewal',
      })
    }

    for (const p of posts) {
      await saveTransaction(p)
    }

    const periodDays = Number(loan.period) || 30
    const nextDue = new Date(dateStr)
    nextDue.setDate(nextDue.getDate() + periodDays)
    const existingFeatures = (() => {
      if (!loan.extraFeatures) return {}
      try { return JSON.parse(loan.extraFeatures) } catch { return { note: loan.extraFeatures } }
    })()

    await saveLoan({
      ...loan,
      date: dateStr,
      loanAmount: newPrincipal,
      extraFeatures: JSON.stringify({
        ...existingFeatures,
        status: mode === 'close' ? 'closed' : 'active',
        lastRenewalDate: dateStr,
        nextDueDate: nextDue.toISOString().slice(0, 10),
        lastRenewalMode: mode,
        lastAmountPaid: amountPaid,
        lastPenaltyPaid: penaltyPaid,
        lastInterestPaid: interestPaid,
        lastPrincipalPaid: principalPaid,
        lastUnpaidRenewal: unpaidRenewal,
        closedDate: mode === 'close' ? dateStr : undefined,
      }),
    })

    return NextResponse.json({
      success: true,
      posts: posts.length,
      mode,
      interest,
      penalty,
      daysRenewed,
      amountPaid,
      penaltyPaid,
      interestPaid,
      principalPaid,
      unpaidRenewal,
      newPrincipal,
      partial,
      loanRef,
    })
  } catch (error: any) {
    console.error('Error in renewal:', error)
    return NextResponse.json(
      { error: 'Failed to post renewal', details: error.message || String(error) },
      { status: 500 }
    )
  }
}
