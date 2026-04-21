'use client'

/**
 * General Calculator — runs every ledger's live math (via lib/finance).
 * Settings → Ledgers controls the default rate for each type.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import type { LoanType } from '@/types'
import {
  PageHeader, Card, CardHeader, CardBody, Button, Field, Input, Select,
  Money, Badge, InfoGrid, DataTable, EmptyState,
} from '@/components/ui'
import {
  calcCD, calcHP, calcSTBD, calcTBD,
  formatDate, getEffectiveRule, LEDGER_RULES,
} from '@/lib/finance'

const TYPES: LoanType[] = ['CD', 'HP', 'STBD', 'TBD', 'OD', 'FD', 'RD']

export default function CalculatorPage() {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  const [loanType, setLoanType] = useState<LoanType>('CD')
  const rule = getEffectiveRule(loanType)

  const [principal, setPrincipal] = useState(100000)
  const [date, setDate] = useState(today)
  const [period, setPeriod] = useState<number>(100) // days / installments / months depending on type
  const [rate, setRate] = useState<number>(rule.defaultRate)
  const [overdueRate, setOverdueRate] = useState<number>(rule.defaultOverdueRate)
  const [paid, setPaid] = useState(0)
  const [documentCharges, setDocumentCharges] = useState(100)

  // When the loan type changes, reset rate+overdue to that type's effective defaults.
  function onTypeChange(t: LoanType) {
    const r = getEffectiveRule(t)
    setLoanType(t)
    setRate(r.defaultRate)
    setOverdueRate(r.defaultOverdueRate)
    // Sensible defaults for the period field per type
    if (t === 'CD' || t === 'OD') setPeriod(100)          // days
    else if (t === 'STBD') setPeriod(100)                 // installments
    else if (t === 'HP') setPeriod(360)                   // days tenure
    else if (t === 'TBD' || t === 'FD' || t === 'RD') setPeriod(360)
  }

  const result = useMemo(() => {
    const base = { principal, loanDate: date, rate, overdueRate, amountPaid: paid }
    if (loanType === 'CD' || loanType === 'OD') {
      return { kind: 'cd', data: calcCD(base) } as const
    }
    if (loanType === 'HP') {
      const tenureMonths = Math.max(1, Math.round(period / 30))
      return { kind: 'hp', data: calcHP({ ...base, tenureMonths }) } as const
    }
    if (loanType === 'STBD') {
      return { kind: 'stbd', data: calcSTBD({ ...base, totalInstallments: Math.max(1, period), installmentFrequencyDays: 1 }) } as const
    }
    // TBD, FD, RD — term compound
    const tenureMonths = Math.max(1, Math.round(period / 30))
    return { kind: 'tbd', data: calcTBD({ ...base, tenureMonths }) } as const
  }, [loanType, principal, date, rate, overdueRate, period, paid])

  const payment = Math.max(0, principal - documentCharges)

  return (
    <div>
      <PageHeader
        title="General Calculator"
        subtitle="Try any ledger's math. Rate defaults come from Settings → Ledgers."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Calculator' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={() => typeof window !== 'undefined' && window.print()}><Printer className="w-4 h-4" />Print</Button>
          </>
        }
      />

      <div className="p-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader
            title="Inputs"
            subtitle={rule.label}
            actions={<Badge tone="info">{loanType}</Badge>}
          />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Loan Type" className="sm:col-span-2">
                <Select value={loanType} onChange={e => onTypeChange(e.target.value as LoanType)}>
                  {TYPES.map(t => <option key={t} value={t}>{LEDGER_RULES[t].label}</option>)}
                </Select>
              </Field>
              <Field label="Principal (₹)">
                <Input type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value) || 0)} />
              </Field>
              <Field label="Date">
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </Field>
              <Field label={loanType === 'STBD' ? 'Installments' : 'Period (days)'}>
                <Input type="number" value={period} onChange={e => setPeriod(Number(e.target.value) || 0)} />
              </Field>
              <Field label="Rate (% / month)">
                <Input type="number" step="0.01" value={rate} onChange={e => setRate(Number(e.target.value) || 0)} />
              </Field>
              <Field label="Overdue (% / month)">
                <Input type="number" step="0.01" value={overdueRate} onChange={e => setOverdueRate(Number(e.target.value) || 0)} />
              </Field>
              <Field label="Amount Paid (₹)">
                <Input type="number" value={paid} onChange={e => setPaid(Number(e.target.value) || 0)} />
              </Field>
              <Field label="Document (₹)" className="sm:col-span-2">
                <Input type="number" value={documentCharges} onChange={e => setDocumentCharges(Number(e.target.value) || 0)} />
              </Field>
            </div>
            <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-xs text-emerald-700 font-semibold uppercase">Payout</span>
              <Money value={payment} tone="credit" />
              <span className="text-xs text-slate-500 ml-auto">= Principal − Document</span>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Summary" subtitle="Live calculation using the same engine as the ledgers" />
            <CardBody>
              {result.kind === 'cd' && (
                <InfoGrid columns={3} items={[
                  { label: 'Period (days)',    value: result.data.periodDays },
                  { label: 'Interest',         value: <Money value={result.data.presentInterest} tone="debit" /> },
                  { label: 'Penalty',          value: <Money value={result.data.penalty} tone="debit" /> },
                  { label: 'Amount paid',      value: <Money value={result.data.amountPaid} tone="credit" /> },
                  { label: 'Total balance',    value: <Money value={result.data.totalBalance} /> },
                  { label: 'For close',        value: <Money value={result.data.totalAmtForClose} /> },
                ]} />
              )}
              {result.kind === 'hp' && (
                <InfoGrid columns={3} items={[
                  { label: 'Tenure',           value: `${result.data.tenureMonths} mo` },
                  { label: 'Installments',     value: result.data.installments },
                  { label: 'EMI',              value: <Money value={result.data.emi} /> },
                  { label: 'Total interest',   value: <Money value={result.data.totalInterest} tone="debit" /> },
                  { label: 'Total payable',    value: <Money value={result.data.totalPayable} /> },
                  { label: 'Outstanding',      value: <Money value={result.data.outstanding} tone="debit" /> },
                ]} />
              )}
              {result.kind === 'stbd' && (
                <InfoGrid columns={3} items={[
                  { label: 'Installments',     value: result.data.totalInstallments },
                  { label: 'Each',             value: <Money value={result.data.installmentAmount} /> },
                  { label: 'Total interest',   value: <Money value={result.data.totalInterest} tone="debit" /> },
                  { label: 'Total amount',     value: <Money value={result.data.totalAmount} /> },
                  { label: 'Late fees',        value: <Money value={result.data.lateFees} tone="debit" /> },
                  { label: 'Due amount',       value: <Money value={result.data.dueAmount} tone="debit" /> },
                ]} />
              )}
              {result.kind === 'tbd' && (
                <InfoGrid columns={3} items={[
                  { label: 'Tenure',           value: `${result.data.tenureMonths} mo` },
                  { label: 'Elapsed',          value: `${result.data.elapsedMonths} mo` },
                  { label: 'Remaining',        value: `${result.data.remainingMonths} mo` },
                  { label: 'Premium so far',   value: <Money value={result.data.premium} tone="credit" /> },
                  { label: 'Maturity amount',  value: <Money value={result.data.maturityAmount} /> },
                  { label: 'Maturity date',    value: formatDate(result.data.dueDate) },
                ]} />
              )}
            </CardBody>
          </Card>

          {(result.kind === 'hp' || result.kind === 'stbd') && (
            <Card>
              <CardHeader
                title="Schedule"
                subtitle={result.kind === 'hp' ? `${result.data.installments} EMIs` : `${result.data.totalInstallments} instalments · first 40`}
              />
              <CardBody className="!p-0">
                <DataTable className="!border-0 !rounded-none">
                  <thead>
                    {result.kind === 'hp' ? (
                      <tr><th>#</th><th>Due</th><th className="text-right">Principal</th><th className="text-right">Interest</th><th className="text-right">EMI</th><th className="text-right">Balance</th></tr>
                    ) : (
                      <tr><th>#</th><th>Due</th><th className="text-right">Instalment</th><th className="text-right">Balance</th><th>Status</th></tr>
                    )}
                  </thead>
                  <tbody>
                    {(result.kind === 'hp' ? result.data.schedule : result.data.schedule.slice(0, 40)).map(r => (
                      <tr key={r.sn}>
                        <td>{r.sn}</td>
                        <td>{formatDate(r.dueDate)}</td>
                        {result.kind === 'hp' ? (
                          <>
                            <td className="text-right"><Money value={r.principal} plain /></td>
                            <td className="text-right"><Money value={r.interest} plain /></td>
                            <td className="text-right"><Money value={r.installment} /></td>
                            <td className="text-right"><Money value={r.balance} tone={r.balance > 0 ? 'debit' : 'credit'} /></td>
                          </>
                        ) : (
                          <>
                            <td className="text-right"><Money value={r.installment} /></td>
                            <td className="text-right"><Money value={r.balance} tone={r.balance > 0 ? 'debit' : 'credit'} /></td>
                            <td>
                              {r.status === 'paid'     && <Badge tone="credit">Paid</Badge>}
                              {r.status === 'due'      && <Badge tone="info">Due</Badge>}
                              {r.status === 'overdue'  && <Badge tone="warn">Overdue</Badge>}
                              {r.status === 'upcoming' && <Badge tone="muted">Upcoming</Badge>}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </CardBody>
            </Card>
          )}

          {!result && <EmptyState title="Enter values" description="Adjust the inputs to see a live calculation." />}
        </div>
      </div>
    </div>
  )
}
