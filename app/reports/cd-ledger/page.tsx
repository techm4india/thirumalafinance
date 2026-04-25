'use client'

/**
 * CD Ledger — Cash Deposit
 *
 * Production layout: accounts list (left), account details + live calc (center),
 * transaction ledger (bottom). Renewal / partial-renewal open the shared
 * RenewalModal. All interest math flows through `calcCD()` from the finance lib,
 * so changing the CD rate in /lib/finance/config.ts updates this page automatically.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Printer, Save, ArrowDownToLine, XCircle } from 'lucide-react'
import type { CDLoan, LedgerTransaction } from '@/types'
import RenewalModal, { type RenewalMode } from '@/components/RenewalModal'
import {
  PageHeader, Card, CardHeader, CardBody, Button, Field, Input, Select,
  Money, Badge, InfoGrid, DataTable, EmptyState,
} from '@/components/ui'
import { calcCD, formatDate, getEffectiveRule as getLedgerRule } from '@/lib/finance'

export default function CDLedgerPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<CDLoan[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loan, setLoan] = useState<Partial<CDLoan>>({ overdueRate: 0.75 })
  const [txns, setTxns] = useState<LedgerTransaction[]>([])
  const [renewalOpen, setRenewalOpen] = useState(false)
  const [renewalMode, setRenewalMode] = useState<RenewalMode>('full')
  const [renewalDate, setRenewalDate] = useState(new Date().toISOString().slice(0, 10))
  const [renewing, setRenewing] = useState(false)
  const [search, setSearch] = useState('')
  const rule = getLedgerRule('CD')
  const cdOverdueRate = 0.75
  const selectedAccount = useMemo(
    () => accounts.find(a => a.id === selected),
    [accounts, selected]
  )

  useEffect(() => { fetchAccounts() }, [])
  useEffect(() => {
    if (!selected) return
    fetchAccountDetails(selected)
    fetchLedger(selected)
  }, [selected])

  function isClosedLoan(value: Partial<CDLoan>) {
    const raw = (value as any).extraFeatures
    if (!raw || typeof raw !== 'string') return false
    try { return JSON.parse(raw).status === 'closed' } catch { return raw.includes('"status":"closed"') }
  }

  async function fetchAccounts() {
    try {
      const r = await fetch('/api/loans?type=CD')
      if (!r.ok) return
      const d = await r.json()
      setAccounts(Array.isArray(d) ? d.filter(a => !isClosedLoan(a)) : [])
    } catch { setAccounts([]) }
  }
  async function fetchAccountDetails(id: string) {
    try {
      const r = await fetch(`/api/loans/${id}`)
      if (!r.ok) {
        const fallback = accounts.find(a => a.id === id)
        if (fallback) setLoan({ ...fallback, loanDate: fallback.date, overdueRate: cdOverdueRate })
        return
      }
      const d = await r.json()
      const periodDays = Number(d.period) || 30
      const due = new Date(d.date)
      due.setDate(due.getDate() + periodDays)
      setLoan({
        ...d,
        loanDate: d.date,
        dueDate: d.dueDate || due.toISOString().slice(0, 10),
        receiptNo: d.receiptNo || d.number,
        rate: d.rate || d.rateOfInterest,
        overdueRate: cdOverdueRate,
        loanAmount: Number(d.loanAmount ?? selectedAccount?.loanAmount) || 0,
      })
    } catch {}
  }
  async function fetchLedger(id: string) {
    try {
      const r = await fetch(`/api/ledger/${id}`)
      if (!r.ok) { setTxns([]); return }
      const d = await r.json()
      setTxns(Array.isArray(d) ? d : [])
    } catch { setTxns([]) }
  }

  // Live calculation — the single source of truth.
  const calc = useMemo(() => {
    const principal = Number(loan.loanAmount ?? selectedAccount?.loanAmount) || 0
    if (!loan.loanDate || principal <= 0) return null
    const amountPaid = txns.reduce((s, t) => {
      if (!loan.loanDate || t.date <= loan.loanDate) return s
      return s + (Number(t.debit) || 0)
    }, 0)
    const periodDays = Number(loan.period) || 30
    const dueDate = loan.dueDate || (() => {
      const due = new Date(loan.loanDate!)
      due.setDate(due.getDate() + periodDays)
      return due.toISOString().slice(0, 10)
    })()
    return calcCD({
      principal,
      loanDate: loan.loanDate!,
      dueDate,
      rate: loan.rate ?? rule.defaultRate,
      overdueRate: cdOverdueRate,
      amountPaid,
    })
  }, [loan.loanAmount, selectedAccount?.loanAmount, loan.loanDate, loan.dueDate, loan.rate, loan.period, txns, rule.defaultRate])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter(a =>
      (a.customerName || '').toLowerCase().includes(q) ||
      String(a.number || '').includes(q)
    )
  }, [accounts, search])

  const modalCalc = useMemo(() => {
    const principal = Number(loan.loanAmount ?? selectedAccount?.loanAmount) || 0
    if (!loan.loanDate || principal <= 0) return calc
    return calcCD({
      principal,
      loanDate: loan.loanDate,
      dueDate: loan.dueDate,
      rate: loan.rate ?? rule.defaultRate,
      overdueRate: cdOverdueRate,
      today: renewalDate,
    })
  }, [calc, loan.loanAmount, selectedAccount?.loanAmount, loan.loanDate, loan.dueDate, loan.rate, renewalDate, rule.defaultRate])

  const openRenewal = (mode: RenewalMode) => {
    setRenewalDate(new Date().toISOString().slice(0, 10))
    setRenewalMode(mode)
    setRenewalOpen(true)
  }

  const setField = (k: string, v: any) => setLoan(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!loan.id) return alert('Select an account first')
    try {
      const r = await fetch(`/api/loans/${loan.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loan),
      })
      if (r.ok) alert('Saved')
      else alert('Save failed')
    } catch { alert('Network error') }
  }

  async function handleRenewalConfirm(amount: number, mode: RenewalMode, postDate: string) {
    if (!loan.id) return
    const principal = Number(loan.loanAmount ?? selectedAccount?.loanAmount) || 0
    if (principal <= 0) return alert('Principal is missing. Select the account again or edit the loan amount first.')
    setRenewing(true)
    try {
      const effectiveCalc = calcCD({
        principal,
        loanDate: loan.loanDate || loan.date || postDate,
        dueDate: loan.dueDate,
        rate: loan.rate ?? rule.defaultRate,
        overdueRate: cdOverdueRate,
        today: postDate,
      })

      const r = await fetch(`/api/loans/${loan.id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          postDate,
          amountPaid: amount,
          interest: effectiveCalc.presentInterest,
          penalty: effectiveCalc.penalty,
          daysRenewed: effectiveCalc.periodDays,
          userName: 'RAMESH',
        }),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error(e.details || e.error || 'Renewal failed')
      }
      setRenewalOpen(false)
      await fetchLedger(loan.id)
      await fetchAccountDetails(loan.id)
      await fetchAccounts()
      alert(mode === 'close' ? 'Loan closed' : mode === 'partial' ? 'Partial renewal recorded' : 'Loan renewed')
    } catch (e: any) { alert(e?.message || 'Renewal failed') }
    finally { setRenewing(false) }
  }

  const currentPrincipal = Number(loan.loanAmount ?? selectedAccount?.loanAmount) || 0

  return (
    <div>
      <PageHeader
        title="CD Ledger"
        subtitle="Cash Deposit · simple daily interest, principal rolls on renewal"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Ledgers' }, { label: 'CD' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={() => typeof window !== 'undefined' && window.print()}><Printer className="w-4 h-4" />Print</Button>
            <Button onClick={handleSave} disabled={!loan.id}><Save className="w-4 h-4" />Save</Button>
          </>
        }
      />

      <div className="p-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Accounts list */}
        <Card className="no-print lg:sticky lg:top-16 self-start max-h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
          <CardHeader title="Accounts" subtitle={`${accounts.length} total`} />
          <div className="px-4 pb-3">
            <Input placeholder="Search name or #" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="overflow-y-auto scrollbar-thin border-t border-slate-100">
            {filtered.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">No matches.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map(a => (
                  <li key={a.id}>
                    <button
                      onClick={() => setSelected(a.id!)}
                      className={`w-full text-left px-4 py-3 text-sm ${selected === a.id ? 'bg-indigo-50 border-l-2 border-indigo-600' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-slate-900 truncate">#{a.number} · {a.customerName}</div>
                        <Badge tone="info">CD</Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatDate(a.date)} · <Money value={Number(a.loanAmount) || 0} plain className="text-slate-500" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {!selected ? (
            <Card><CardBody>
              <EmptyState title="Select an account" description="Pick a CD account on the left to view its ledger and renewal status." />
            </CardBody></Card>
          ) : (
            <>
              {/* Account header */}
              <Card>
                <CardHeader
                  title={`${loan.customerName || '—'}`}
                  subtitle={`CD #${loan.number} · loan date ${formatDate(loan.loanDate || loan.date || '')}`}
                  actions={
                    <>
                      <Badge tone="info">CD</Badge>
                      {calc && calc.overdueDays > 0 && <Badge tone="warn">{calc.overdueDays}d overdue</Badge>}
                    </>
                  }
                />
                <CardBody>
                  <InfoGrid columns={4} items={[
                    { label: 'Aadhaar', value: loan.aadhaar || '—' },
                    { label: 'Phone', value: loan.phone1 || '—' },
                    { label: 'Address', value: loan.address || '—' },
                    { label: 'Partner', value: loan.partnerName || '—' },
                  ]} />
                </CardBody>
              </Card>

              {/* Editable params + live calc */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Terms" subtitle="Principal, rates, due date" />
                  <CardBody>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Principal (₹)">
                        <Input
                          type="number"
                          value={currentPrincipal || ''}
                          onChange={e => setField('loanAmount', Number(e.target.value) || 0)}
                          placeholder="Auto from selected loan amount"
                        />
                      </Field>
                      <Field label="Rate (% / month)">
                        <Input type="number" step="0.01" value={loan.rate ?? rule.defaultRate} onChange={e => setField('rate', Number(e.target.value))} />
                      </Field>
                      <Field label="Overdue Rate (% / month)">
                        <Input type="number" step="0.01" value={cdOverdueRate} readOnly />
                      </Field>
                      <Field label="Period (days)">
                        <Input type="number" value={loan.period ?? ''} onChange={e => setField('period', Number(e.target.value) || 0)} />
                      </Field>
                      <Field label="Loan Date">
                        <Input type="date" value={loan.loanDate || ''} onChange={e => setField('loanDate', e.target.value)} />
                      </Field>
                      <Field label="Due Date">
                        <Input type="date" value={loan.dueDate || ''} onChange={e => setField('dueDate', e.target.value)} />
                      </Field>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader
                    title="Live calculation"
                    subtitle="Computed from today's date — matches renewal amount"
                    actions={<Button onClick={() => selected && fetchLedger(selected)}><RefreshCw className="w-4 h-4" />Recalc</Button>}
                  />
                  <CardBody>
                    {!calc ? (
                      <p className="text-sm text-slate-500">Enter principal and loan date.</p>
                    ) : (
                      <>
                        <InfoGrid columns={2} items={[
                          { label: 'Period',          value: `${calc.periodDays} days` },
                          { label: 'Overdue',         value: `${calc.overdueDays} days` },
                          { label: 'Present interest', value: <Money value={calc.presentInterest} tone="debit" /> },
                          { label: 'Penalty',         value: <Money value={calc.penalty} tone="debit" /> },
                          { label: 'Amount paid',     value: <Money value={calc.amountPaid} tone="credit" /> },
                          { label: 'Total balance',   value: <Money value={calc.totalBalance} tone="debit" /> },
                        ]} />
                        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-slate-500">Amount for renewal</div>
                            <div className="text-xl font-semibold text-slate-900"><Money value={calc.totalAmtForRenewal} tone="debit" /></div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Amount for close</div>
                            <div className="text-xl font-semibold text-slate-900"><Money value={calc.totalAmtForClose} tone="debit" /></div>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 no-print">
                          <Button variant="success" onClick={() => openRenewal('full')}>
                            <ArrowDownToLine className="w-4 h-4" />Full renewal
                          </Button>
                          <Button onClick={() => openRenewal('partial')}>
                            <ArrowDownToLine className="w-4 h-4" />Partial payment
                          </Button>
                          <Button variant="danger" onClick={() => openRenewal('close')}>
                            <XCircle className="w-4 h-4" />Close loan
                          </Button>
                        </div>
                      </>
                    )}
                  </CardBody>
                </Card>
              </div>

              {/* Ledger transactions */}
              <Card>
                <CardHeader title="Ledger" subtitle="All transactions on this account" />
                <CardBody className="!p-0">
                  {txns.length === 0 ? (
                    <div className="p-5 text-sm text-slate-500">No transactions yet on this account.</div>
                  ) : (
                    <DataTable className="!border-0 !rounded-none">
                      <thead>
                        <tr>
                          <th>Date</th><th>Particulars</th><th>R.No</th>
                          <th className="text-right">Credit</th><th className="text-right">Debit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txns.map((t, i) => (
                          <tr key={i}>
                            <td>{formatDate(t.date)}</td>
                            <td className="truncate max-w-[360px]">{t.particulars || '—'}</td>
                            <td className="text-slate-500">{t.rno || '—'}</td>
                            <td className="text-right"><Money value={t.credit || 0} tone={t.credit ? 'credit' : 'muted'} /></td>
                            <td className="text-right"><Money value={t.debit || 0} tone={t.debit ? 'debit' : 'muted'} /></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="text-right">Totals</td>
                          <td className="text-right"><Money value={txns.reduce((s, t) => s + (t.credit || 0), 0)} tone="credit" /></td>
                          <td className="text-right"><Money value={txns.reduce((s, t) => s + (t.debit || 0), 0)} tone="debit" /></td>
                        </tr>
                      </tfoot>
                    </DataTable>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>

      <RenewalModal
        isOpen={renewalOpen}
        onClose={() => setRenewalOpen(false)}
        mode={renewalMode}
        totalRenewalAmount={modalCalc?.totalAmtForRenewal || 0}
        totalCloseAmount={modalCalc?.totalAmtForClose || 0}
        interestAmount={modalCalc?.presentInterest || 0}
        penaltyAmount={modalCalc?.penalty || 0}
        postDate={renewalDate}
        onPostDateChange={setRenewalDate}
        customerName={loan.customerName || ''}
        loanNumber={String(loan.number || '')}
        currentLoanAmount={Number(loan.loanAmount) || 0}
        onConfirm={handleRenewalConfirm}
        isLoading={renewing}
      />
    </div>
  )
}
