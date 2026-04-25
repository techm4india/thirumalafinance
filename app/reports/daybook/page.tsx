'use client'

import { useState, useEffect } from 'react'
import { Printer, Trash2 } from 'lucide-react'
import type { DayBookEntry } from '@/types'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Button, Badge,
  Money, DataTable, EmptyState, StatCard,
} from '@/components/ui'
import { formatDate } from '@/lib/finance'

export default function DayBookPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [entries, setEntries] = useState<DayBookEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [date])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/reports/daybook?date=${date}`)
      const d = await r.json().catch(() => [])
      setEntries(Array.isArray(d) ? d : [])
    } finally { setLoading(false) }
  }

  async function handleDeleteDate() {
    const phrase = prompt(`Delete all day-book entries for ${formatDate(date)}?\n\nType DELETE DAYBOOK to confirm.`)
    if (phrase !== 'DELETE DAYBOOK') return
    try {
      const r = await fetch(`/api/transactions?all=true&date=${encodeURIComponent(date)}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Delete failed')
      alert('Day-book entries deleted for selected date')
      await load()
    } catch (e: any) { alert(e.message || 'Delete failed') }
  }

  const credit = entries.reduce((s, e) => s + (Number(e.credit) || 0), 0)
  const debit = entries.reduce((s, e) => s + (Number(e.debit) || 0), 0)

  return (
    <div>
      <PageHeader
        title="Day Book"
        subtitle="Daily ledger rollup of cashbook + loan transactions"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Reports', href: '/reports' }, { label: 'Day Book' }]}
        actions={
          <>
            <Button variant="danger" onClick={handleDeleteDate} disabled={entries.length === 0}>
              <Trash2 className="w-4 h-4" />Delete This Date
            </Button>
            <Button variant="primary" onClick={() => window.print()}><Printer className="w-4 h-4" />Print</Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader title="Date" />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
              <StatCard label="Total credit" value={<Money value={credit} tone="credit" />} />
              <StatCard label="Total debit" value={<Money value={debit} tone="debit" />} />
            </div>
          </CardBody>
        </Card>

        <Card className="print-card">
          <div className="text-center py-6 border-b border-slate-200 bg-slate-50">
            <div className="text-xl font-bold">TIRUMALA FINANCE</div>
            <div className="text-xs text-slate-600">Head Office · Andhra Pradesh, India</div>
            <div className="mt-1 text-sm font-semibold">Day Book — {formatDate(date)}</div>
          </div>
          <CardBody className="!p-0">
            {loading ? (
              <div className="p-6 text-sm text-slate-500">Loading…</div>
            ) : entries.length === 0 ? (
              <div className="p-6"><EmptyState title="No entries" description="No day-book entries for the selected date." /></div>
            ) : (
              <div className="overflow-x-auto">
                <DataTable className="!border-0 !rounded-none">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Head of A/c</th>
                      <th>Particulars</th>
                      <th>No.</th>
                      <th className="text-right">Credit</th>
                      <th className="text-right">Debit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => (
                      <tr key={e.sn}>
                        <td>{e.sn}</td>
                        <td className="font-medium">{e.headOfAccount}</td>
                        <td className="max-w-[340px] truncate">{e.particulars}</td>
                        <td>{e.number || '—'}</td>
                        <td className="text-right"><Money value={Number(e.credit) || 0} tone="credit" plain /></td>
                        <td className="text-right"><Money value={Number(e.debit) || 0} tone="debit" plain /></td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan={4} className="text-right">Total</td>
                      <td className="text-right"><Money value={credit} tone="credit" /></td>
                      <td className="text-right"><Money value={debit} tone="debit" /></td>
                    </tr>
                  </tbody>
                </DataTable>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
