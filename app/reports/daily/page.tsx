'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import type { DailyReport } from '@/types'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Button, Money,
  StatCard, DataTable, EmptyState,
} from '@/components/ui'
import { formatDate } from '@/lib/finance'

export default function DailyReportPage() {
  const router = useRouter()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [date])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/reports/daily?date=${date}`)
      const d = await r.json().catch(() => null)
      setReport(d && typeof d === 'object' && 'transactions' in d ? d : null)
    } finally { setLoading(false) }
  }

  function shiftDate(days: number) {
    const n = new Date(date); n.setDate(n.getDate() + days)
    setDate(n.toISOString().slice(0, 10))
  }

  return (
    <div>
      <PageHeader
        title="Daily Report"
        subtitle="Chronological transaction log with account-summary sidebar"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Reports', href: '/reports' }, { label: 'Daily' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={() => shiftDate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button onClick={() => shiftDate(1)}><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="primary" onClick={() => window.print()}><Printer className="w-4 h-4" />Print</Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <Field label="Date" className="sm:col-span-1"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
              <StatCard label="Credit total" value={<Money value={report?.creditTotal || 0} tone="credit" />} />
              <StatCard label="Debit total" value={<Money value={report?.debitTotal || 0} tone="debit" />} />
              <StatCard label="Closing balance" value={<Money value={report?.closingBalance || 0} />} />
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="print-card">
            <CardHeader title={`Transactions · ${formatDate(date)}`} subtitle={`${report?.transactions?.length || 0} rows`} />
            <CardBody className="!p-0">
              {loading ? (
                <div className="p-6 text-sm text-slate-500">Loading…</div>
              ) : !report || report.transactions.length === 0 ? (
                <div className="p-6"><EmptyState title="No transactions" description="Nothing posted for this date." /></div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable className="!border-0 !rounded-none">
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th>Particulars</th>
                        <th>R.No</th>
                        <th className="text-right">Credit</th>
                        <th className="text-right">Debit</th>
                        <th>User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.transactions.map((t, i) => (
                        <tr key={i}>
                          <td className="font-medium">{t.accountName}</td>
                          <td className="max-w-[320px] truncate">{t.particulars}</td>
                          <td>{t.rno || t.number || '—'}</td>
                          <td className="text-right"><Money value={Number(t.credit) || 0} tone="credit" plain /></td>
                          <td className="text-right"><Money value={Number(t.debit) || 0} tone="debit" plain /></td>
                          <td className="text-xs text-slate-500">{t.userName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              )}
            </CardBody>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Account summary" />
              <CardBody className="!p-0">
                {!report || report.accountSummary.length === 0 ? (
                  <div className="p-6"><EmptyState title="No accounts" /></div>
                ) : (
                  <DataTable className="!border-0 !rounded-none">
                    <thead>
                      <tr><th>Account</th><th className="text-right">Credit</th><th className="text-right">Debit</th></tr>
                    </thead>
                    <tbody>
                      {report.accountSummary.map((a, i) => (
                        <tr key={i}>
                          <td className="font-medium">{a.accountName}</td>
                          <td className="text-right"><Money value={Number(a.credit) || 0} tone="credit" plain /></td>
                          <td className="text-right"><Money value={Number(a.debit) || 0} tone="debit" plain /></td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
