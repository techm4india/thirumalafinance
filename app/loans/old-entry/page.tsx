'use client'

/**
 * Old-data entry — mirrors the Access CD LEDGER row-by-row pattern so admin can
 * migrate an existing customer's full history (disbursal + hold + doc charges
 * + every past renewal pair) into the new system.
 *
 * The system then computes forward from the LAST renewal date to today —
 * showing accrued interest (3%), penalty (0.75%/month after 5-day grace),
 * next due date, and total balance dynamically on /loans/renew/[id].
 *
 * Ledger pattern (from Access screenshot — SHIRISHA CHADA example):
 *   Date        A/c Name                    Credit         Debit
 *   20-Nov-24   CD A/C                          0.00  25,00,000.00   ← disbursal
 *   20-Nov-24   CD COMMISSION A/C          75,000.00       0.00      ← 3% hold
 *   20-Nov-24   CD DOCUMENT CHARGES A/C     2,500.00       0.00      ← doc charges
 *   21-Jan-25   CD Commission A/c          76,225.00       0.00   ┐ renewal #1
 *   21-Jan-25   PENALTY CD A/C             19,375.00       0.00   ┘
 *   19-Jun-25   CD Commission A/c        1,60,000.00       0.00   ┐ renewal #2
 *   19-Jun-25   PENALTY CD A/C             40,000.00       0.00   ┘
 *   ...
 */

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, Trash2, Download } from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Select, Textarea,
  Button, Money, StatCard, DataTable, EmptyState, Badge, InfoGrid,
} from '@/components/ui'
import { LEDGER_RULES, calcCD, formatDate } from '@/lib/finance'
import type { LoanType } from '@/types'

interface RenewalRow {
  date: string            // YYYY-MM-DD — when this renewal happened in the real world
  daysRenewed: number     // days since previous renewal (or since loan date for #1)
  interest: number        // CD COMMISSION credit for that date
  penalty: number         // PENALTY CD credit for that date
  partialPaid: number     // any cash partial collected that day
  note?: string
}

const LOAN_TYPES: LoanType[] = ['CD', 'HP', 'STBD', 'TBD', 'FD', 'OD', 'RD']

export default function OldEntryPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedPartnerId, setSelectedPartnerId] = useState('')

  // Loan basics — blank by default so admin can fill in fresh.
  // When a customer is picked, their existing running loan is auto-loaded.
  const [form, setForm] = useState({
    number: 0,
    loanType: 'CD' as LoanType,
    date: '',                       // disbursal date — leave blank
    dueDate: '',                    // auto from period if empty
    customerName: '',
    fatherName: '',
    aadhaar: '',
    address: '',
    phone1: '',
    partnerName: '',
    loanAmount: 0,
    rateOfInterest: 3,              // 3% / month (default only)
    holdPercent: 3,                 // 3% flat hold (default only)
    documentCharges: 0,
    period: 60,                     // default billing cycle in days
    particulars: 'OLD DATA MIGRATION',
  })
  const [loadingLoan, setLoadingLoan] = useState(false)
  const [loanFoundNote, setLoanFoundNote] = useState<string | null>(null)
  // Tracks whether an existing loan was loaded for this customer.
  // If set → save will skip loan creation and only append renewal rows.
  const [existingLoanId, setExistingLoanId] = useState<string | null>(null)

  const [renewals, setRenewals] = useState<RenewalRow[]>([])

  useEffect(() => { loadRefData() }, [])

  async function loadRefData() {
    try {
      const [c, p] = await Promise.all([
        fetch('/api/customers').then(r => r.ok ? r.json() : []),
        fetch('/api/partners').then(r => r.ok ? r.json() : []),
      ])
      setCustomers(Array.isArray(c) ? c : [])
      setPartners(Array.isArray(p) ? p : [])
    } catch {}
  }

  async function onCustomer(id: string) {
    setSelectedCustomerId(id)
    setLoanFoundNote(null)
    setExistingLoanId(null)
    const c = customers.find(x => x.id === id)
    if (!c) return
    // 1) Pre-fill customer details
    setForm(p => ({
      ...p,
      customerName: c.name || '',
      aadhaar: c.aadhaar || '',
      fatherName: c.father || '',
      address: c.address || '',
      phone1: c.phone1 || '',
    }))
    // 2) Look up their most recent running loan — if one exists, auto-fill
    //    principal / loan date / rate / due date / partner so admin doesn't
    //    have to re-type it. Admin can still override any field.
    setLoadingLoan(true)
    try {
      const r = await fetch('/api/loans')
      if (!r.ok) return
      const loans: any[] = await r.json()
      // Match loans belonging to this customer by name (case-insensitive).
      const mine = loans.filter(l =>
        (l.customerName || '').trim().toLowerCase() === (c.name || '').trim().toLowerCase()
      )
      if (!mine.length) {
        setLoanFoundNote('No existing loan found for this customer — enter fresh basics below.')
        return
      }
      // Take the newest by date
      mine.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      const latest = mine[0]
      setForm(p => ({
        ...p,
        number: Number(latest.number) || p.number,
        loanType: (latest.loanType as LoanType) || p.loanType,
        date: latest.date || p.date,
        dueDate: latest.dueDate || p.dueDate,
        loanAmount: Number(latest.loanAmount) || p.loanAmount,
        rateOfInterest: Number(latest.rateOfInterest) || p.rateOfInterest,
        holdPercent: Number(latest.holdAnnualPercent) || p.holdPercent,
        documentCharges: Number(latest.documentCharges) || p.documentCharges,
        period: Number(latest.period) || p.period,
        partnerName: latest.partnerName || p.partnerName,
        particulars: latest.particulars || p.particulars,
      }))
      if (latest.partnerId) setSelectedPartnerId(latest.partnerId)
      setExistingLoanId(latest.id || null)
      setLoanFoundNote(
        `Loaded existing loan ${latest.loanType}-${latest.number} dated ${latest.date}. ` +
        `Save will APPEND renewal rows to this loan — no duplicate will be created.`
      )
    } catch {
      setLoanFoundNote('Could not look up running loan — enter basics manually.')
    } finally {
      setLoadingLoan(false)
    }
  }

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  // Auto-compute days-renewed from previous row/loan-date
  function daysBetween(a: string, b: string) {
    if (!a || !b) return 0
    const ms = new Date(b).getTime() - new Date(a).getTime()
    return Math.max(0, Math.round(ms / 86400000))
  }

  function addRenewal() {
    const principal = Number(form.loanAmount) || 0
    const rate = Number(form.rateOfInterest) || 3
    const prevDate = renewals.length ? renewals[renewals.length - 1].date : form.date
    const nextDate = (() => {
      const d = new Date(prevDate || new Date())
      d.setDate(d.getDate() + 30)
      return d.toISOString().slice(0, 10)
    })()
    const days = daysBetween(prevDate, nextDate)
    const interest = Math.round((principal * rate / 100) * (days / 30) * 100) / 100
    setRenewals(p => [...p, { date: nextDate, daysRenewed: days, interest, penalty: 0, partialPaid: 0 }])
  }

  function setRenewal(i: number, k: keyof RenewalRow, v: any) {
    setRenewals(p => p.map((r, idx) => {
      if (idx !== i) return r
      const next: any = { ...r, [k]: v }
      // If user changed the date, auto-recompute daysRenewed vs previous
      if (k === 'date') {
        const prev = idx === 0 ? form.date : p[idx - 1].date
        next.daysRenewed = daysBetween(prev, String(v))
      }
      return next
    }))
  }

  function removeRenewal(i: number) {
    setRenewals(p => p.filter((_, idx) => idx !== i))
  }

  // Derived ledger preview — what the old-data entry will post
  const holdAmount = useMemo(
    () => Math.round((Number(form.loanAmount) * Number(form.holdPercent) / 100) * 100) / 100,
    [form.loanAmount, form.holdPercent]
  )
  const netDisbursement = Math.max(0, Number(form.loanAmount) - holdAmount)
  const totalInterestSoFar = renewals.reduce((s, r) => s + (Number(r.interest) || 0), 0)
  const totalPenaltySoFar = renewals.reduce((s, r) => s + (Number(r.penalty) || 0), 0)
  const totalPartialSoFar = renewals.reduce((s, r) => s + (Number(r.partialPaid) || 0), 0)

  // Live ledger rows (exactly what will post)
  const ledgerRows = useMemo(() => {
    const rows: Array<{ date: string; account: string; credit: number; debit: number }> = []
    const p = Number(form.loanAmount) || 0
    if (p > 0) {
      rows.push({ date: form.date, account: 'CD A/C', credit: 0, debit: p })
      if (holdAmount > 0) rows.push({ date: form.date, account: 'CD COMMISSION A/C', credit: holdAmount, debit: 0 })
      if (Number(form.documentCharges) > 0) rows.push({ date: form.date, account: 'CD DOCUMENT CHARGES A/C', credit: Number(form.documentCharges), debit: 0 })
    }
    renewals.forEach(r => {
      if (Number(r.interest) > 0) rows.push({ date: r.date, account: 'CD Commission A/c', credit: Number(r.interest), debit: 0 })
      if (Number(r.penalty) > 0) rows.push({ date: r.date, account: 'PENALTY CD A/C', credit: Number(r.penalty), debit: 0 })
      if (Number(r.partialPaid) > 0) rows.push({ date: r.date, account: 'CASH A/C', credit: 0, debit: Number(r.partialPaid) })
    })
    return rows
  }, [form.date, form.loanAmount, form.documentCharges, holdAmount, renewals])

  // What the system will show AFTER save — forward calc from last renewal to today
  const forwardCalc = useMemo(() => {
    const principal = Number(form.loanAmount) || 0
    if (!principal || !form.date) return null
    const rate = Number(form.rateOfInterest) || 3
    const lastRenewalDate = renewals.length ? renewals[renewals.length - 1].date : form.date
    // Next due date = last renewal + period days
    const dueDate = form.dueDate || (() => {
      const d = new Date(lastRenewalDate)
      d.setDate(d.getDate() + (Number(form.period) || 30))
      return d.toISOString().slice(0, 10)
    })()
    const calc = calcCD({
      principal, rate, loanDate: lastRenewalDate, dueDate,
      today: new Date(),
    })
    return { ...calc, dueDate }
  }, [form.date, form.dueDate, form.loanAmount, form.rateOfInterest, form.period, renewals])

  async function save() {
    if (!form.customerName.trim()) return alert('Enter customer name')
    if (!form.loanAmount || form.loanAmount <= 0) return alert('Enter loan amount')
    if (!renewals.length) {
      if (!confirm('No renewal rows added. Save anyway?')) return
    }

    // Decide: append to existing loan, or create a new one?
    const willCreateNew = !existingLoanId
    const confirmMsg = willCreateNew
      ? `Create NEW loan for ${form.customerName} and post ${renewals.length} renewal row(s)?`
      : `Append ${renewals.length} renewal row(s) to EXISTING loan ${form.loanType}-${form.number} (${form.customerName})?\n\nNo duplicate loan will be created.`
    if (!confirm(confirmMsg)) return

    setSaving(true)
    try {
      let loanId = existingLoanId

      // Only create a new loan record if one didn't already exist
      if (!loanId) {
        const loanBody = {
          ...form,
          userName: 'ADMIN (migration)',
          entryTime: new Date().toISOString(),
          documentCharges: Number(form.documentCharges) || 0,
          partialPaid: totalPartialSoFar,
          holdAnnualPercent: form.holdPercent,
          holdAmount,
          netDisbursement,
          description: 'Migrated from Access ledger — old data entry',
          partnerId: selectedPartnerId || undefined,
        }
        const r = await fetch('/api/loans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loanBody),
        })
        if (!r.ok) {
          const e = await r.json().catch(() => ({}))
          alert(`Loan save failed: ${e.error || e.details || 'unknown'}`)
          return
        }
        const saved = await r.json().catch(() => null)
        loanId = saved?.loan?.id || saved?.id
        if (!loanId) { alert('Loan saved but no id returned — cannot post renewals'); return }
      }

      // Post each renewal through the renewal API with historical date
      let ok = 0
      for (const rw of renewals) {
        const rr = await fetch(`/api/loans/${loanId}/renew`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interest: Number(rw.interest) || 0,
            penalty: Number(rw.penalty) || 0,
            daysRenewed: Number(rw.daysRenewed) || 0,
            partial: Number(rw.partialPaid) > 0,
            amountPaid: Number(rw.partialPaid) || 0,
            postDate: rw.date,
            userName: 'ADMIN (migration)',
          }),
        })
        if (rr.ok) ok++
      }

      const action = willCreateNew ? 'Loan created' : 'Appended to existing loan'
      const fromDate = renewals.length ? renewals[renewals.length - 1].date : form.date
      alert(`${action}. Posted ${ok}/${renewals.length} renewal row(s).\nSystem will now compute dynamic interest/penalty/due forward from ${fromDate}.`)
      router.push(`/loans/renew/${loanId}`)
    } catch (e: any) {
      alert(`Error: ${e.message || 'Network error'}`)
    } finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader
        title="Old-data entry"
        subtitle={
          existingLoanId
            ? `Appending renewal history to existing loan ${form.loanType}-${form.number} — NO duplicate will be created`
            : 'Migrate an existing customer\'s loan + full renewal history — system computes forward dynamically'
        }
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Loans' }, { label: 'Old-data entry' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : existingLoanId ? 'Append renewals to existing loan' : 'Create loan + post ledger'}
            </Button>
          </>
        }
      />
      {loanFoundNote && (
        <div className={`mx-6 mt-4 rounded-md border px-4 py-2 text-sm ${existingLoanId ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
          {loanFoundNote}
        </div>
      )}

      <div className="p-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* 1. Customer */}
          <Card>
            <CardHeader title="1. Customer" subtitle="Pick existing to auto-fill, or fill in manually" />
            <CardBody>
              <Field label="Pick existing customer" className="mb-4">
                <Select value={selectedCustomerId} onChange={e => onCustomer(e.target.value)}>
                  <option value="">— Fresh customer —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.customerId} — {c.name}{c.father ? ` (${c.father})` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Customer name" required><Input value={form.customerName} onChange={e => setField('customerName', e.target.value)} /></Field>
                <Field label="Father"><Input value={form.fatherName} onChange={e => setField('fatherName', e.target.value)} /></Field>
                <Field label="Aadhaar"><Input value={form.aadhaar} onChange={e => setField('aadhaar', e.target.value)} /></Field>
                <Field label="Phone"><Input type="tel" value={form.phone1} onChange={e => setField('phone1', e.target.value)} /></Field>
                <Field label="Address" className="sm:col-span-2"><Input value={form.address} onChange={e => setField('address', e.target.value)} /></Field>
                <Field label="Partner">
                  <Select value={selectedPartnerId} onChange={e => {
                    const id = e.target.value; setSelectedPartnerId(id)
                    const p = partners.find(x => x.id === id)
                    if (p) setField('partnerName', p.name)
                  }}>
                    <option value="">— Select partner —</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </Field>
                <Field label="Partner name"><Input value={form.partnerName} onChange={e => setField('partnerName', e.target.value)} /></Field>
              </div>
            </CardBody>
          </Card>

          {/* 2. Loan basics */}
          <Card>
            <CardHeader
              title="2. Loan basics (as originally disbursed)"
              subtitle="These create the first 3 daybook rows: CD A/C (debit) + CD COMMISSION (3% hold) + CD DOCUMENT CHARGES"
            />
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Ledger type">
                  <Select value={form.loanType} onChange={e => setField('loanType', e.target.value as LoanType)}>
                    {LOAN_TYPES.map(t => <option key={t} value={t}>{LEDGER_RULES[t].label}</option>)}
                  </Select>
                </Field>
                <Field label="Loan number"><Input type="number" value={form.number} onChange={e => setField('number', Number(e.target.value) || 0)} /></Field>
                <Field label="Rate (% / month)"><Input type="number" step="0.01" value={form.rateOfInterest} onChange={e => setField('rateOfInterest', Number(e.target.value) || 0)} /></Field>
                <Field label="Loan date" required><Input type="date" value={form.date} onChange={e => setField('date', e.target.value)} /></Field>
                <Field label="Due date (optional)"><Input type="date" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)} /></Field>
                <Field label="Billing period (days)"><Input type="number" value={form.period} onChange={e => setField('period', Number(e.target.value) || 0)} /></Field>
                <Field label="Principal (₹)" required><Input type="number" value={form.loanAmount || ''} onChange={e => setField('loanAmount', Number(e.target.value) || 0)} /></Field>
                <Field label="Hold % (flat, 3% default)"><Input type="number" step="0.1" value={form.holdPercent} onChange={e => setField('holdPercent', Number(e.target.value) || 0)} /></Field>
                <Field label="Document charges (₹)"><Input type="number" value={form.documentCharges || ''} onChange={e => setField('documentCharges', Number(e.target.value) || 0)} /></Field>
                <Field label="Particulars" className="sm:col-span-3"><Textarea rows={2} value={form.particulars} onChange={e => setField('particulars', e.target.value)} /></Field>
              </div>
            </CardBody>
          </Card>

          {/* 3. Renewals */}
          <Card>
            <CardHeader
              title="3. Past renewals (from Access CD Ledger)"
              subtitle="Each row = one date posting CD Commission + PENALTY CD pair. Days auto-calc from previous date."
              actions={<Button onClick={addRenewal}><Plus className="w-4 h-4" />Add renewal</Button>}
            />
            <CardBody className="!p-0">
              {renewals.length === 0 ? (
                <div className="p-6"><EmptyState title="No renewals yet" description="Click Add renewal for each row in the old Access ledger. Leave blank if no past renewals." /></div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable className="!border-0 !rounded-none">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Days</th>
                        <th className="text-right">Interest (CD COMM)</th>
                        <th className="text-right">Penalty (PENALTY CD)</th>
                        <th className="text-right">Partial paid</th>
                        <th>Note</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {renewals.map((r, i) => (
                        <tr key={i}>
                          <td className="text-slate-500">{i + 1}</td>
                          <td><Input type="date" value={r.date} onChange={e => setRenewal(i, 'date', e.target.value)} /></td>
                          <td><Input type="number" value={r.daysRenewed} onChange={e => setRenewal(i, 'daysRenewed', Number(e.target.value) || 0)} /></td>
                          <td><Input type="number" value={r.interest} onChange={e => setRenewal(i, 'interest', Number(e.target.value) || 0)} /></td>
                          <td><Input type="number" value={r.penalty} onChange={e => setRenewal(i, 'penalty', Number(e.target.value) || 0)} /></td>
                          <td><Input type="number" value={r.partialPaid} onChange={e => setRenewal(i, 'partialPaid', Number(e.target.value) || 0)} /></td>
                          <td><Input value={r.note || ''} onChange={e => setRenewal(i, 'note', e.target.value)} /></td>
                          <td>
                            <button onClick={() => removeRenewal(i)} className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              )}
            </CardBody>
          </Card>

          {/* 4. Ledger preview */}
          <Card>
            <CardHeader
              title="4. Ledger preview — exactly what will post"
              subtitle="Mirrors the old Access CD LEDGER layout"
            />
            <CardBody className="!p-0">
              {ledgerRows.length === 0 ? (
                <div className="p-6"><EmptyState title="Nothing to preview yet" description="Enter principal to see the ledger rows." /></div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable className="!border-0 !rounded-none">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>A/c Name</th>
                        <th className="text-right">Credit</th>
                        <th className="text-right">Debit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRows.map((r, i) => (
                        <tr key={i}>
                          <td>{formatDate(r.date)}</td>
                          <td className="font-semibold">{r.account}</td>
                          <td className="text-right"><Money value={r.credit} tone={r.credit > 0 ? 'credit' : undefined} /></td>
                          <td className="text-right"><Money value={r.debit} tone={r.debit > 0 ? 'debit' : undefined} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Summary" subtitle="What gets saved to the new system" />
            <CardBody>
              <div className="grid gap-3">
                <StatCard label="Principal" value={<Money value={form.loanAmount} />} />
                <StatCard label={`Hold (${form.holdPercent}%)`} value={<Money value={holdAmount} tone="debit" />} />
                <StatCard label="Document charges" value={<Money value={form.documentCharges} tone="credit" />} />
                <StatCard label="Net disbursement" value={<Money value={netDisbursement} tone="credit" />} />
                <StatCard label="Renewals entered" value={renewals.length} />
                <StatCard label="Interest posted so far" value={<Money value={totalInterestSoFar} tone="credit" />} />
                <StatCard label="Penalty posted so far" value={<Money value={totalPenaltySoFar} tone="credit" />} />
                <StatCard label="Partial collected" value={<Money value={totalPartialSoFar} tone="credit" />} />
              </div>
            </CardBody>
          </Card>

          {forwardCalc && (
            <Card>
              <CardHeader title="Forward calc (today)" subtitle="How the system computes from the last renewal → today" />
              <CardBody>
                <InfoGrid columns={1} items={[
                  { label: 'Days since last renewal', value: forwardCalc.periodDays },
                  { label: 'Overdue days', value: forwardCalc.overdueDays },
                  { label: 'Accrued interest (3%)', value: <Money value={forwardCalc.presentInterest} tone="debit" /> },
                  { label: 'Penalty (0.75% after 5d grace)', value: <Money value={forwardCalc.penalty} tone="debit" /> },
                  { label: 'Total balance today', value: <Money value={forwardCalc.totalBalance} tone="debit" /> },
                  { label: 'Next due', value: forwardCalc.dueDate ? formatDate(forwardCalc.dueDate) : '—' },
                ]} />
                <p className="text-xs text-slate-500 mt-3">
                  After save, this exact calculation will drive the renewal page — updating every day based on today's date.
                </p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="How this works" />
            <CardBody>
              <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4">
                <li>Creates the loan record with original principal + loan date.</li>
                <li>Auto-posts the first 3 rows: <Badge tone="debit">CD A/C</Badge> + <Badge tone="credit">CD COMMISSION (3% hold)</Badge> + <Badge tone="credit">CD DOC CHARGES</Badge>.</li>
                <li>Each past renewal row posts <Badge tone="credit">CD Commission</Badge> + <Badge tone="credit">PENALTY CD</Badge> at the historical date.</li>
                <li>System then computes interest/penalty/due forward from last renewal to today — dynamically.</li>
                <li>Redirects to the renewal page so you can post next renewal whenever customer comes in.</li>
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
