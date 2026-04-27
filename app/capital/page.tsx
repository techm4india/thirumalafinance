'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Users, X, Printer } from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Select,
  Button, Money, StatCard, DataTable, EmptyState, Badge,
} from '@/components/ui'
import { formatDate } from '@/lib/finance'

interface CapitalTransaction {
  id: string
  date: string
  credit: number
  debit: number
  particulars?: string
  partnerId?: string
  partnerName?: string
}

interface PartnerRow { id: string; name: string; credit: number }

export default function CapitalPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    partnerId: '',
    particulars: '',
    credit: 0,
    debit: 0,
  })
  const [transactions, setTransactions] = useState<CapitalTransaction[]>([])
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [bulk, setBulk] = useState({ credit: 0, debit: 0 })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadPartners(); loadTransactions() }, [])

  async function loadPartners() {
    try {
      const r = await fetch('/api/partners')
      const d = await r.json().catch(() => [])
      setPartners((Array.isArray(d) ? d : []).map((p: any) => ({ id: p.id, name: p.name, credit: 0 })))
    } catch {}
  }

  async function loadTransactions() {
    try {
      const r = await fetch('/api/capital/transactions', { cache: 'no-store' })
      const d = await r.json().catch(() => [])
      setTransactions(Array.isArray(d) ? d : [])
    } catch {}
  }

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.particulars.trim()) return alert('Enter particulars')
    if (form.credit === 0 && form.debit === 0) return alert('Enter credit or debit')
    if (form.credit > 0 && form.debit > 0) return alert('Credit OR debit — not both')
    setSaving(true)
    try {
      const r = await fetch('/api/capital/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error(e.error || 'Save failed')
      }
      alert('Capital entry saved')
      setForm({
        date: new Date().toISOString().slice(0, 10),
        partnerId: '', particulars: '', credit: 0, debit: 0,
      })
      await loadTransactions()
    } catch (e: any) { alert(`Error: ${e.message}`) }
    finally { setSaving(false) }
  }

  async function applyBulk(kind: 'credit' | 'debit') {
    const amt = kind === 'credit' ? bulk.credit : bulk.debit
    if (!amt || amt <= 0) return alert('Enter an amount')
    if (partners.length === 0) return alert('No partners loaded')
    if (!confirm(`${kind === 'credit' ? 'Credit' : 'Debit'} ₹${amt} split across ${partners.length} partner(s)?`)) return
    const per = amt / partners.length
    setSaving(true)
    try {
      await Promise.all(partners.map(p =>
        fetch('/api/capital/transactions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: form.date,
            partnerId: p.id,
            particulars: `Bulk ${kind} to all partners`,
            credit: kind === 'credit' ? per : 0,
            debit:  kind === 'debit'  ? per : 0,
          }),
        })
      ))
      setBulk({ credit: 0, debit: 0 })
      await loadTransactions()
      alert(`${kind} distributed`)
    } catch (e: any) { alert(`Error: ${e.message || 'Bulk failed'}`) }
    finally { setSaving(false) }
  }

  const totals = useMemo(() => ({
    credit: transactions.reduce((s, t) => s + (Number(t.credit) || 0), 0),
    debit: transactions.reduce((s, t) => s + (Number(t.debit) || 0), 0),
  }), [transactions])

  const partnerBalances = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (!t.partnerId) continue
      map.set(t.partnerId, (map.get(t.partnerId) || 0) + (Number(t.credit) || 0) - (Number(t.debit) || 0))
    }
    return partners.map(p => ({ ...p, credit: map.get(p.id) || 0 }))
  }, [transactions, partners])

  const totalPartnerCapital = partnerBalances.reduce((s, p) => s + p.credit, 0)

  return (
    <div>
      <PageHeader
        title="Capital Entry"
        subtitle="Partner capital contributions, drawings, and balances"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Capital' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button variant="primary" onClick={() => window.print()}><Printer className="w-4 h-4" />Print</Button>
          </>
        }
      />

      <div className="p-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader title="New entry" />
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Date"><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></Field>
                <Field label="Partner">
                  <Select value={form.partnerId} onChange={e => set('partnerId', e.target.value)}>
                    <option value="">Select partner</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </Field>
                <Field label="Particulars" className="sm:col-span-2">
                  <Input value={form.particulars} onChange={e => set('particulars', e.target.value)} placeholder="e.g. Capital introduction" />
                </Field>
                <Field label="Credit (₹)"><Input type="number" value={form.credit || 0} onChange={e => set('credit', Number(e.target.value) || 0)} /></Field>
                <Field label="Debit (₹)"><Input type="number" value={form.debit || 0} onChange={e => set('debit', Number(e.target.value) || 0)} /></Field>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}
                </Button>
                <Button onClick={() => setForm({ date: new Date().toISOString().slice(0, 10), partnerId: '', particulars: '', credit: 0, debit: 0 })}>
                  <X className="w-4 h-4" />Reset
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Bulk distribution"
              subtitle={`Splits amount equally across ${partners.length} partner(s)`}
            />
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex gap-2">
                  <Input type="number" value={bulk.credit} onChange={e => setBulk(b => ({ ...b, credit: Number(e.target.value) || 0 }))} placeholder="Credit all" />
                  <Button variant="success" onClick={() => applyBulk('credit')} disabled={saving}>
                    <Users className="w-4 h-4" />Credit all
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input type="number" value={bulk.debit} onChange={e => setBulk(b => ({ ...b, debit: Number(e.target.value) || 0 }))} placeholder="Debit all" />
                  <Button variant="danger" onClick={() => applyBulk('debit')} disabled={saving}>
                    <Users className="w-4 h-4" />Debit all
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Transactions" subtitle={`${transactions.length} entries`} />
            <CardBody className="!p-0">
              {transactions.length === 0 ? (
                <div className="p-6"><EmptyState title="No transactions" description="Post entries from the form above." /></div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable className="!border-0 !rounded-none">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Partner</th>
                        <th>Particulars</th>
                        <th className="text-right">Credit</th>
                        <th className="text-right">Debit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t.id}>
                          <td>{formatDate(t.date)}</td>
                          <td>{t.partnerName || partners.find(p => p.id === t.partnerId)?.name || '—'}</td>
                          <td className="max-w-[240px] truncate">{t.particulars || '—'}</td>
                          <td className="text-right"><Money value={Number(t.credit) || 0} tone="credit" plain /></td>
                          <td className="text-right"><Money value={Number(t.debit) || 0} tone="debit" plain /></td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-medium">
                        <td colSpan={3} className="text-right">Totals</td>
                        <td className="text-right"><Money value={totals.credit} tone="credit" /></td>
                        <td className="text-right"><Money value={totals.debit} tone="debit" /></td>
                      </tr>
                    </tbody>
                  </DataTable>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Total capital in" value={<Money value={totals.credit} tone="credit" />} />
            <StatCard label="Total drawings" value={<Money value={totals.debit} tone="debit" />} />
          </div>
          <Card>
            <CardHeader
              title="Partner balances"
              subtitle={`${partnerBalances.length} partners · net ₹${totalPartnerCapital.toFixed(2)}`}
              actions={<Badge tone="info">Live</Badge>}
            />
            <CardBody className="!p-0">
              {partnerBalances.length === 0 ? (
                <div className="p-6"><EmptyState title="No partners" description="Register partners first to track capital." /></div>
              ) : (
                <DataTable className="!border-0 !rounded-none">
                  <thead>
                    <tr><th>Name</th><th className="text-right">Net capital</th></tr>
                  </thead>
                  <tbody>
                    {partnerBalances.map(p => (
                      <tr key={p.id}>
                        <td className="font-medium text-slate-900">{p.name}</td>
                        <td className="text-right"><Money value={p.credit} tone={p.credit < 0 ? 'debit' : 'credit'} /></td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-medium">
                      <td className="text-right">Total</td>
                      <td className="text-right"><Money value={totalPartnerCapital} /></td>
                    </tr>
                  </tbody>
                </DataTable>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
