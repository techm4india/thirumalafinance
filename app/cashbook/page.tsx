'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, X, Printer } from 'lucide-react'
import type { Transaction } from '@/types'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Select, Textarea,
  Button, Badge, Money, StatCard, DataTable, EmptyState,
} from '@/components/ui'
import { formatDate } from '@/lib/finance'

interface CashBookEntry extends Transaction { accountNumber?: string }

export default function CashBookPage() {
  const router = useRouter()
  const [form, setForm] = useState<Partial<CashBookEntry>>({
    date: new Date().toISOString().slice(0, 10),
    userName: 'RAMESH',
    credit: 0, debit: 0,
  })
  const [entries, setEntries] = useState<CashBookEntry[]>([])
  const [accountHeads, setAccountHeads] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isNewAccount, setIsNewAccount] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { load(); loadAccounts() }, [])

  async function loadAccounts() {
    try {
      const r = await fetch('/api/reports/ledger/accounts')
      if (r.ok) {
        const d = await r.json()
        const uniq = Array.from(new Set((d || []).map((x: any) => x.aName))).filter(Boolean) as string[]
        setAccountHeads(uniq.sort())
      }
    } catch {}
  }

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/transactions')
      const d = await r.json().catch(() => [])
      const rows: CashBookEntry[] = (Array.isArray(d) ? d : []).map((t: Transaction) => ({ ...t, accountNumber: t.number || '' }))
      rows.sort((a, b) => {
        const byDate = (b.date || '').localeCompare(a.date || '')
        if (byDate !== 0) return byDate
        return (b.entryTime || '').localeCompare(a.entryTime || '')
      })
      setEntries(rows)
    } finally { setLoading(false) }
  }

  const set = (k: keyof CashBookEntry, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.date) return alert('Please select a date')
    if (!form.accountName?.trim()) return alert('Enter head of A/c')
    if (!form.particulars?.trim()) return alert('Enter particulars')
    const credit = Number(form.credit) || 0
    const debit = Number(form.debit) || 0
    if (credit === 0 && debit === 0) return alert('Enter either credit or debit')
    if (credit > 0 && debit > 0) return alert('Enter credit OR debit — not both')

    setSaving(true)
    try {
      const tx: Transaction = {
        date: form.date!,
        accountName: form.accountName!,
        particulars: form.particulars!,
        number: form.accountNumber || undefined,
        rno: form.accountNumber || undefined,
        credit, debit,
        userName: form.userName || 'RAMESH',
        entryTime: new Date().toISOString(),
        transactionType: 'cash_book_entry',
      }
      const r = await fetch('/api/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error(e.error || 'Save failed')
      }
      alert('Entry saved')
      setForm({
        date: new Date().toISOString().slice(0, 10),
        userName: 'RAMESH', credit: 0, debit: 0,
      })
      setIsNewAccount(false)
      await load(); await loadAccounts()
    } catch (e: any) { alert(`Error: ${e.message}`) }
    finally { setSaving(false) }
  }

  const totals = useMemo(() => ({
    credit: entries.reduce((s, e) => s + (Number(e.credit) || 0), 0),
    debit: entries.reduce((s, e) => s + (Number(e.debit) || 0), 0),
  }), [entries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(e =>
      (e.accountName || '').toLowerCase().includes(q) ||
      (e.particulars || '').toLowerCase().includes(q) ||
      (e.number || '').toLowerCase().includes(q) ||
      (e.date || '').includes(q)
    )
  }, [entries, search])

  return (
    <div>
      <PageHeader
        title="Cash Book"
        subtitle="Day-book entries · credit / debit posted to general ledger"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Cash Book' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button variant="primary" onClick={() => window.print()}><Printer className="w-4 h-4" />Print</Button>
          </>
        }
      />

      <div className="p-6 grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="self-start">
          <CardHeader title="New entry" subtitle="Every field except Account Number is required" />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date" required>
                <Input type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} />
              </Field>
              <Field label="Account Number">
                <Input value={form.accountNumber || ''} onChange={e => set('accountNumber', e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Head of A/c" required className="sm:col-span-2">
                {isNewAccount ? (
                  <div className="space-y-2">
                    <Input autoFocus value={form.accountName || ''} onChange={e => set('accountName', e.target.value)} placeholder="New account name" />
                    <button type="button" className="text-xs text-indigo-600 hover:text-indigo-700" onClick={() => setIsNewAccount(false)}>
                      ← Pick from existing
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Select value={form.accountName || ''} onChange={e => set('accountName', e.target.value)}>
                      <option value="">Select…</option>
                      {accountHeads.map(h => <option key={h} value={h}>{h}</option>)}
                    </Select>
                    <button type="button" className="text-xs text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1" onClick={() => setIsNewAccount(true)}>
                      <Plus className="w-3 h-3" /> New account
                    </button>
                  </div>
                )}
              </Field>
              <Field label="Particulars" required className="sm:col-span-2">
                <Textarea rows={3} value={form.particulars || ''} onChange={e => set('particulars', e.target.value)} />
              </Field>
              <Field label="Credit (₹)">
                <Input type="number" step="0.01" value={form.credit || 0} onChange={e => set('credit', Number(e.target.value) || 0)} />
              </Field>
              <Field label="Debit (₹)">
                <Input type="number" step="0.01" value={form.debit || 0} onChange={e => set('debit', Number(e.target.value) || 0)} />
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save entry'}
              </Button>
              <Button onClick={() => { setForm({ date: new Date().toISOString().slice(0, 10), userName: 'RAMESH', credit: 0, debit: 0 }); setIsNewAccount(false) }}>
                <X className="w-4 h-4" />Reset
              </Button>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total credits" value={<Money value={totals.credit} tone="credit" />} />
            <StatCard label="Total debits" value={<Money value={totals.debit} tone="debit" />} />
            <StatCard label="Net" value={<Money value={totals.credit - totals.debit} />} />
          </div>

          <Card>
            <CardHeader
              title="Recent entries"
              subtitle={`${filtered.length} of ${entries.length}`}
              actions={<Badge tone="muted">Newest first</Badge>}
            />
            <CardBody className="!p-0">
              <div className="p-4 pb-0">
                <Input placeholder="Filter by head, particulars, date, account…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {loading ? (
                <div className="p-6 text-sm text-slate-500">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-6"><EmptyState title="No entries" description="Post an entry from the form on the left." /></div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable className="!border-0 !rounded-none">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Head of A/c</th>
                        <th>Particulars</th>
                        <th className="text-right">Debit</th>
                        <th className="text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e, i) => (
                        <tr key={e.id || i}>
                          <td className="whitespace-nowrap">{formatDate(e.date)}</td>
                          <td className="font-medium text-slate-900">{e.accountName}</td>
                          <td className="max-w-[340px] truncate">{e.particulars}</td>
                          <td className="text-right"><Money value={Number(e.debit) || 0} tone="debit" plain /></td>
                          <td className="text-right"><Money value={Number(e.credit) || 0} tone="credit" plain /></td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
