import { NextRequest, NextResponse } from 'next/server'
import { getLoans, saveTransaction } from '@/lib/data'
import { calcCD } from '@/lib/finance'
import type { Transaction } from '@/types'

/**
 * POST /api/loans/:id/renew
 * Body: { interest: number, penalty: number, daysRenewed: number, amountPaid?: number, partial?: boolean }
 *
 * Mirrors the Access "Renewal Account" workflow:
 *   - Credits CD COMMISSION A/C with the interest component
 *   - Credits PENALTY CD A/C with the penalty component (if > 0)
 *   - Both rows carry the loan number as RNO and a "<N> Days Renewed" particular
 *
 * Partial payments are recorded under the same flow with a `partial: true` flag.
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
    const partial = !!body.partial
    const amountPaid = Number(body.amountPaid) || 0
    const loanRef = `${loan.loanType}-${loan.number}`
    const particular = `${daysRenewed} Days Renewed${partial ? ' (Partial)' : ''}`
    const userName = (body.userName as string) || 'ADMIN'

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

    // 3. Partial receipt (cash in). Only if amountPaid > 0.
    if (amountPaid > 0) {
      posts.push({
        date: dateStr,
        accountName: 'CASH A/C',
        particulars: `${particular} — cash received`,
        rno: loanRef,
        number: String(loan.number),
        credit: 0,
        debit: amountPaid,
        userName,
        entryTime: today.toISOString(),
        transactionType: 'loan_renewal',
      })
    }

    for (const p of posts) {
      await saveTransaction(p)
    }

    return NextResponse.json({
      success: true,
      posts: posts.length,
      interest,
      penalty,
      daysRenewed,
      amountPaid,
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
