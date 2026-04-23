'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, RotateCcw, Printer, CheckCircle2 } from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Button, Money,
  StatCard, EmptyState, Badge, InfoGrid,
} from '@/components/ui'
import { calcCD, formatDate } from '@/lib/finance'

/**
 * Renewal Account workflow — mirrors Access CD LEDGER buttons:
 *   - Renewal Account        (full interest + penalty posting, principal rolls)
 *   - Partial Payment + Renewal  (same + cash receipt)
 *   - Close Account          (full principal + interest + penalty)
 */
export default function RenewLoanPage() {
  const router = useRouter()
  const params = useParams() as { id: string }
  const id = params?.id
  const [loan, setLoan] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])  // past daybook rows for this loan
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [partialAmount, setPartialAmount] = useState<number>(0)
  const [result, setResult] = useState<any>(null)

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/loans/${id}`)
      if (!r.ok) return
      const lo = await r.json()
      setLoan(lo)
      // Load daybook rows for this loan → used to find last renewal date + total paid.
      // We filter client-side by rno matching the loan ref.
      const ref = `${lo.loanType}-${lo.number}`
      const tx = await fetch('/api/transactions').then(rr => rr.ok ? rr.json() : []).catch(() => [])
      const mine = Array.isArray(tx) ? tx.filter((t: any) => (t.rno || '') === ref) : []
      setHistory(mine)
    } finally { setLoading(false) }
  }

  // Effective snapshot — last renewal date, total paid so far
  const snapshot = useMemo(() => {
    if (!loan) return { lastRenewalDate: '', paidSoFar: 0 }
    // Find the most recent "Days Renewed" posting — that's when interest was last reset.
    const renewalRows = history
      .filter(t => /Days Renewed/i.test(t.particulars || ''))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    const lastRenewalDate = renewalRows[0]?.date || loan.date || ''
    // Sum partial cash receipts
    const paidSoFar = history
      .filter(t => /cash received/i.test(t.particulars || ''))
      .reduce((s, t) => s + (Number(t.debit) || 0), 0)
    return { lastRenewalDate, paidSoFar }
  }, [loan, history])

  const calc = useMemo(() => {
    if (!loan) return null
    const effectiveLoanDate = snapshot.lastRenewalDate || loan.date
    // Due date = effective loan date + period days (or explicit loan.dueDate if still future)
    const periodDays = Number(loan.period) > 0 ? Number(loan.period) : 30
    const dueDate = (() => {
      const d = new Date(effectiveLoanDate)
      d.setDate(d.getDate() + periodDays)
      return d.toISOString().slice(0, 10)
    })()
    return calcCD({
      principal: Number(loan.loanAmount) || 0,
      loanDate: effectiveLoanDate,
      rate: Number(loan.rateOfInterest) || undefined,
      dueDate,
      amountPaid: partialAmount,
      today: new Date(),
    })
  }, [loan, partialAmount, snapshot.lastRenewalDate])

  async function post(mode: 'renewal' | 'partial' | 'close') {
    if (!calc || !loan) return
    if (!confirm(`Post ${mode.toUpperCase()} for ${loan.customerName}?`)) return
    setPosting(true)
    try {
      const body: any = {
        interest: calc.presentInterest,
        penalty: calc.penalty,
        daysRenewed: calc.periodDays,
        partial: mode !== 'renewal',
        amountPaid: mode === 'renewal' ? 0 : partialAmount,
      }
      if (mode === 'close') {
        body.interest = calc.presentInterest
        body.penalty = calc.penalty
        body.amountPaid = calc.totalAmtForClose
        body.partial = false
      }
      const r = await fetch(`/api/loans/${id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (r.ok) {
        setResult({ mode, ...d })
        alert(`${mode.toUpperCase()} posted — ${d.posts} daybook rows`)
      } else alert(`Failed: ${d.error || d.details || 'Unknown error'}`)
    } catch (e: any) {
      alert(`Error: ${e.message || 'Network error'}`)
    } finally { setPosting(false) }
  }

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading loan…</div>
  if (!loan) return (
    <div className="p-6">
      <EmptyState title="Loan not found" description="This loan may have been deleted." />
    </div>
  )

  const loanRef = `${loan.loanType}-${loan.number}`

  return (
    <div>
      <PageHeader
        title={`Renew ${loanRef}`}
        subtitle={`${loan.customerName} · ${formatDate(loan.date)}`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Loans', href: '/loans/edit' }, { label: 'Renew' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={() => window.print()}><Printer className="w-4 h-4" />Print</Button>
          </>
        }
      />

      <div className="p-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Loan position today"
              subtitle={
                snapshot.lastRenewalDate && snapshot.lastRenewalDate !== loan.date
                  ? `${calc?.periodDays || 0} days since last renewal (${formatDate(snapshot.lastRenewalDate)})`
                  : `${calc?.periodDays || 0} days since disbursal`
              }
              actions={<Badge tone="info">{loan.loanType}</Badge>}
            />
            <CardBody>
              {!calc ? (
                <EmptyState title="No calc" />
              ) : (
                <InfoGrid columns={2} items={[
                  { label: 'Principal',        value: <Money value={calc.principal} /> },
                  { label: 'Rate',             value: `${calc.rate}% / month` },
                  { label: 'Days since loan',  value: calc.periodDays },
                  { label: 'Overdue days',     value: calc.overdueDays },
                  { label: 'Accrued interest (3%)', value: <Money value={calc.presentInterest} tone="debit" /> },
                  { label: 'Penalty (0.75%)',  value: <Money value={calc.penalty} tone="debit" /> },
                  { label: 'Partials paid earlier', value: <Money value={snapshot.paidSoFar} tone="credit" /> },
                  { label: 'Renewal amount',   value: <Money value={calc.totalAmtForRenewal} /> },
                  { label: 'Total balance',    value: <Money value={calc.totalBalance} tone="debit" /> },
                  { label: 'Close amount',     value: <Money value={calc.totalAmtForClose} tone="debit" /> },
                ]} />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Partial payment" subtitle="For Partial Payment + Renewal option" />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Partial amount (₹)">
                  <Input
                    type="number"
                    min={0}
                    value={partialAmount || ''}
                    onChange={e => setPartialAmount(Number(e.target.value) || 0)}
                  />
                </Field>
                <StatCard
                  label="Net balance after partial"
                  value={<Money value={Math.max(0, (calc?.totalBalance || 0) - partialAmount)} tone="debit" />}
                />
              </div>
            </CardBody>
          </Card>

          {result && (
            <Card>
              <CardHeader title={`Posted: ${result.mode?.toUpperCase()}`} subtitle={`${result.posts} daybook rows`} />
              <CardBody>
                <div className="flex items-center gap-2 text-emerald-700 text-sm mb-3">
                  <CheckCircle2 className="w-4 h-4" /> Renewal saved to daybook
                </div>
                <InfoGrid columns={2} items={[
                  { label: 'CD COMMISSION credit', value: <Money value={result.interest} tone="credit" /> },
                  { label: 'PENALTY CD credit',    value: <Money value={result.penalty} tone="credit" /> },
                  { label: 'Days renewed',         value: result.daysRenewed },
                  { label: 'Amount paid',          value: <Money value={result.amountPaid} tone="credit" /> },
                ]} />
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Actions" />
            <CardBody>
              <div className="space-y-2">
                <Button variant="primary" onClick={() => post('renewal')} disabled={posting} className="w-full justify-center">
                  <RotateCcw className="w-4 h-4" />Renewal Account
                </Button>
                <Button onClick={() => post('partial')} disabled={posting || partialAmount <= 0} className="w-full justify-center">
                  Partial Payment + Renewal
                </Button>
                <Button variant="danger" onClick={() => post('close')} disabled={posting} className="w-full justify-center">
                  Close Account
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Each posting creates CD Commission + Penalty CD daybook rows labelled
                "<strong>{calc?.periodDays || 0} Days Renewed</strong>".
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
