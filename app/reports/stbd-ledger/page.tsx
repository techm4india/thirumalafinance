'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react'
import type { Loan, LedgerTransaction } from '@/types'
import {
  PageHeader, Card, CardHeader, CardBody, Button, Field, Input,
  Money, Badge, InfoGrid, DataTable, EmptyState,
} from '@/components/ui'
import { calcSTBD, formatDate, getEffectiveRule as getLedgerRule } from '@/lib/finance'

export default function STBDLedgerPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Loan[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loan, setLoan] = useState<any>({})
  const [txns, setTxns] = useState<LedgerTransaction[]>([])
  const [search, setSearch] = useState('')
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const rule = getLedgerRule('STBD')

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const r = await fetch('/api/loans?type=STBD', { cache: 'no-store' })
      const d = r.ok ? await r.json() : []
      setAccounts(Array.isArray(d) ? d : [])
    } catch { setAccounts([]) }
    finally { setLoadingAccounts(false) }
  }, [])

  const fetchDetail = useCallback(async (id: string) => {
    if (!id) return
    setLoadingDetail(true)
    try {
      const [lr, tr] = await Promise.all([
        fetch(`/api/loans/${id}`, { cache: 'no-store' }),
        fetch(`/api/ledger/${id}`, { cache: 'no-store' }),
      ])
      if (lr.ok) { const d = await lr.json(); setLoan(d || {}) }
      if (tr.ok) { const d = await tr.json(); setTxns(Array.isArray(d) ? d : []) }
      else setTxns([])
    } catch { setTxns([]) }
    finally { setLoadingDetail(false) }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])
  useEffect(() => { if (selected) fetchDetail(selected) }, [selected, fetchDetail])

  const calc = useMemo(() => {
    if (!loan.loanAmount || !loan.date) return null
    const totalInstallments = Math.max(1, Number(loan.period) || 100)
    const amountPaid = txns.reduce((s, t) => s + (Number(t.debit) || 0), 0)
    return calcSTBD({
      principal: Number(loan.loanAmount) || 0,
      loanDate: loan.date,
      rate: loan.rateOfInterest ?? rule.defaultRate,
      totalInstallments,
      installmentFrequencyDays: 1,
      amountPaid,
    })
  }, [loan, txns, rule.defaultRate])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return !q ? accounts : accounts.filter(a =>
      (a.customerName || '').toLowerCase().includes(q) || String(a.number || '').includes(q))
  }, [accounts, search])

  const txnTotals = useMemo(() => ({
    debit: txns.reduce((s, t) => s + (Number(t.debit) || 0), 0),
    credit: txns.reduce((s, t) => s + (Number(t.credit) || 0), 0),
  }), [txns])

  return (
    <div>
      <PageHeader
        title="STBD Ledger"
        subtitle="Short Term Balance Deposit - daily/weekly instalments"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Ledgers' }, { label: 'STBD' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={fetchAccounts} disabled={loadingAccounts}>
              <RefreshCw className={`w-4 h-4 ${loadingAccounts ? 'animate-spin' : ''}`} />
              {loadingAccounts ? 'Loading...' : 'Refresh'}
            </Button>
            <Button onClick={() => typeof window !== 'undefined' && window.print()}><Printer className="w-4 h-4" />Print</Button>
          </>
        }
      />
      <div className="p-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="no-print lg:sticky lg:top-16 self-start max-h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
          <CardHeader title="STBD Accounts" subtitle={loadingAccounts ? 'Loading...' : `${accounts.length} total`} />
          <div className="px-4 pb-3"><Input placeholder="Search name or #" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="overflow-y-auto border-t border-slate-100">
            {filtered.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">{loadingAccounts ? 'Loading...' : 'No STBD accounts found.'}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map(a => (
                  <li key={a.id}>
                    <button onClick={() => setSelected(a.id!)}
                      className={`w-full text-left px-4 py-3 text-sm ${selected === a.id ? 'bg-indigo-50 border-l-2 border-indigo-600' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-slate-900 truncate">#{a.number} - {a.customerName}</div>
                        <Badge tone="info">STBD</Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatDate(a.date)} - <Money value={Number(a.loanAmount) || 0} plain className="text-slate-500" /></div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          {!selected ? (
            <Card><CardBody><EmptyState title="Select an STBD account" description="Pick an account from the left to see instalment schedule and totals." /></CardBody></Card>
          ) : loadingDetail ? (
            <Card><CardBody><p className="text-sm text-slate-500 p-4">Loading account details...</p></CardBody></Card>
          ) : (
            <>
              <Card>
                <CardHeader title={loan.customerName || '—'} subtitle={`STBD #${loan.number} - ${formatDate(loan.date)}`}
                  actions={<><Badge tone="info">STBD</Badge><Button onClick={() => fetchDetail(selected)}><RefreshCw className="w-4 h-4" />Refresh</Button></>} />
                <CardBody>
                  <InfoGrid columns={4} items={[
                    { label: 'Aadhaar', value: loan.aadhaar || '—' },
                    { label: 'Phone', value: loan.phone1 || '—' },
                    { label: 'Address', value: loan.address || '—' },
                    { label: 'Partner', value: loan.partnerName || '—' },
                  ]} />
                </CardBody>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Terms" />
                  <CardBody>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Principal (Rs.)"><Input type="number" value={loan.loanAmount ?? ''} onChange={e => setLoan({ ...loan, loanAmount: Number(e.target.value) || 0 })} /></Field>
                      <Field label="Rate (% / month)"><Input type="number" step="0.01" value={loan.rateOfInterest ?? rule.defaultRate} onChange={e => setLoan({ ...loan, rateOfInterest: Number(e.target.value) })} /></Field>
                      <Field label="Total installments"><Input type="number" value={loan.period ?? ''} onChange={e => setLoan({ ...loan, period: Number(e.target.value) || 0 })} /></Field>
                      <Field label="Date"><Input type="date" value={loan.date || ''} onChange={e => setLoan({ ...loan, date: e.target.value })} /></Field>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title="Summary" />
                  <CardBody>
                    {!calc ? <p className="text-sm text-slate-500">Enter principal and date.</p> : (
                      <InfoGrid columns={2} items={[
                        { label: 'Installments', value: calc.totalInstallments },
                        { label: 'Each instalment', value: <Money value={calc.installmentAmount} /> },
                        { label: 'Total interest', value: <Money value={calc.totalInterest} tone="debit" /> },
                        { label: 'Total amount', value: <Money value={calc.totalAmount} /> },
                        { label: 'Amount paid', value: <Money value={calc.amountPaid} tone="credit" /> },
                        { label: 'Late fees', value: <Money value={calc.lateFees} tone="debit" /> },
                        { label: 'Due amount', value: <Money value={calc.dueAmount} tone="debit" /> },
                        { label: 'Total payable', value: <Money value={calc.totalPayable} tone="debit" /> },
                      ]} />
                    )}
                  </CardBody>
                </Card>
              </div>

              <Card>
                <CardHeader title="Transactions" subtitle={`${txns.length} entries`} />
                <CardBody className="!p-0">
                  {txns.length === 0 ? (
                    <div className="p-5 text-sm text-slate-500">No transactions recorded yet for this account.</div>
                  ) : (
                    <DataTable className="!border-0 !rounded-none">
                      <thead><tr><th>Date</th><th>Particulars</th><th>R.No</th><th className="text-right">Credit</th><th className="text-right">Debit</th></tr></thead>
                      <tbody>
                        {txns.map((t, i) => (
                          <tr key={(t as any).id || i}>
                            <td>{formatDate(t.date)}</td>
                            <td className="max-w-[320px] truncate">{t.particulars || '—'}</td>
                            <td className="text-slate-500">{t.rno || '—'}</td>
                            <td className="text-right"><Money value={Number(t.credit) || 0} tone={t.credit ? 'credit' : 'muted'} plain /></td>
                            <td className="text-right"><Money value={Number(t.debit) || 0} tone={t.debit ? 'debit' : 'muted'} plain /></td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-medium">
                          <td colSpan={3} className="text-right text-slate-600">Totals</td>
                          <td className="text-right"><Money value={txnTotals.credit} tone="credit" /></td>
                          <td className="text-right"><Money value={txnTotals.debit} tone="debit" /></td>
                        </tr>
                      </tbody>
                    </DataTable>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Instalment schedule" subtitle="First 40 rows" />
                <CardBody className="!p-0">
                  {!calc ? <div className="p-5 text-sm text-slate-500">Enter principal and installments to see schedule.</div> : (
                    <DataTable className="!border-0 !rounded-none">
                      <thead><tr><th>#</th><th>Due date</th><th className="text-right">Instalment</th><th className="text-right">Balance</th><th>Status</th></tr></thead>
                      <tbody>
                        {calc.schedule.slice(0, 40).map(r => (
                          <tr key={r.sn}>
                            <td>{r.sn}</td>
                            <td>{formatDate(r.dueDate)}</td>
                            <td className="text-right"><Money value={r.installment} /></td>
                            <td className="text-right"><Money value={r.balance} tone={r.balance > 0 ? 'debit' : 'credit'} /></td>
                            <td>
                              {r.status === 'paid' && <Badge tone="credit">Paid</Badge>}
                              {r.status === 'due' && <Badge tone="info">Due today</Badge>}
                              {r.status === 'overdue' && <Badge tone="warn">Overdue</Badge>}
                              {r.status === 'upcoming' && <Badge tone="muted">Upcoming</Badge>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
