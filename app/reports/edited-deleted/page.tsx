'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RotateCcw, Printer } from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Button, Money,
  StatCard, DataTable, EmptyState, Badge,
} from '@/components/ui'
import { formatDate } from '@/lib/finance'

interface EditedMember {
  id: string
  oDate: string; nDate: string
  oNumber: string; nNumber: string
  oName: string; nName: string
  oAdhaar?: string; nAdhaar?: string
  oAmount: number; nAmount: number
  user: string
}

interface DeletedMember {
  id: string
  date: string
  number: string
  name: string
  aadhaar?: string
  amount: number
  user: string
}

interface DeletedDaybook {
  id: string
  ddate: string
  nameoftheAccount: string
  particulars: string
  accountnumb?: string
}

export default function EditedDeletedPage() {
  const router = useRouter()
  const [fromDate, setFromDate] = useState('2013-04-25')
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [month, setMonth] = useState('2022-01')
  const [editedMembers, setEditedMembers] = useState<EditedMember[]>([])
  const [deletedMembers, setDeletedMembers] = useState<DeletedMember[]>([])
  const [deletedDaybook, setDeletedDaybook] = useState<DeletedDaybook[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => { load() }, [fromDate, toDate, month])

  async function load() {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ fromDate, toDate, month })
      const [editedRes, deletedRes, daybookRes] = await Promise.all([
        fetch(`/api/reports/edited?${params.toString()}`),
        fetch(`/api/reports/deleted?${params.toString()}`),
        fetch(`/api/reports/deleted-daybook?${params.toString()}`),
      ])
      const editedData = await editedRes.json().catch(() => [])
      const deletedData = await deletedRes.json().catch(() => [])
      const daybookData = await daybookRes.json().catch(() => [])

      const errs: string[] = []
      if (!editedRes.ok) errs.push(`Edited: ${editedData?.details || editedData?.error || editedRes.statusText}`)
      if (!deletedRes.ok) errs.push(`Deleted: ${deletedData?.details || deletedData?.error || deletedRes.statusText}`)
      if (!daybookRes.ok) errs.push(`Daybook: ${daybookData?.details || daybookData?.error || daybookRes.statusText}`)
      if (errs.length > 0) {
        setFetchError(errs.join(' · '))
        setEditedMembers([]); setDeletedMembers([]); setDeletedDaybook([])
        return
      }
      setEditedMembers(Array.isArray(editedData) ? editedData : [])
      setDeletedMembers(Array.isArray(deletedData) ? deletedData : [])
      setDeletedDaybook(Array.isArray(daybookData) ? daybookData : [])
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Request failed')
    } finally { setLoading(false) }
  }

  function resetDates() {
    setFromDate('2013-04-25')
    setToDate(new Date().toISOString().split('T')[0])
    setMonth('2022-01')
  }

  return (
    <div>
      <PageHeader
        title="Edited & Deleted"
        subtitle="Audit trail for modified and removed records"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Reports', href: '/reports' }, { label: 'Audit' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={resetDates}><RotateCcw className="w-4 h-4" />Reset</Button>
            <Button variant="primary" onClick={() => window.print()}><Printer className="w-4 h-4" />Print</Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        {fetchError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {fetchError}
          </div>
        )}

        <Card>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
              <Field label="Month"><Input type="month" value={month} onChange={e => setMonth(e.target.value)} /></Field>
              <Field label="From"><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></Field>
              <Field label="To"><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></Field>
              <StatCard label="Edited" value={editedMembers.length} />
              <StatCard label="Deleted" value={deletedMembers.length + deletedDaybook.length} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Edited Members" subtitle={`${editedMembers.length} records`} actions={<Badge tone={loading ? 'warn' : 'info'}>{loading ? 'Loading…' : 'Live'}</Badge>} />
          <CardBody className="!p-0">
            {editedMembers.length === 0 ? (
              <div className="p-6"><EmptyState title={loading ? 'Loading…' : 'No edits'} description="Loan-edit history appears here." /></div>
            ) : (
              <div className="overflow-x-auto">
                <DataTable className="!border-0 !rounded-none">
                  <thead>
                    <tr>
                      <th>ID</th><th>Old date</th><th>New date</th>
                      <th>Old #</th><th>New #</th>
                      <th>Old name</th><th>New name</th>
                      <th>Old Aadhaar</th><th>New Aadhaar</th>
                      <th className="text-right">Old amt</th><th className="text-right">New amt</th>
                      <th>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedMembers.map(m => (
                      <tr key={m.id}>
                        <td className="text-xs">{m.id}</td>
                        <td>{formatDate(m.oDate)}</td>
                        <td>{formatDate(m.nDate)}</td>
                        <td>{m.oNumber}</td>
                        <td>{m.nNumber}</td>
                        <td>{m.oName}</td>
                        <td>{m.nName}</td>
                        <td>{m.oAdhaar || '—'}</td>
                        <td>{m.nAdhaar || '—'}</td>
                        <td className="text-right"><Money value={Number(m.oAmount) || 0} plain /></td>
                        <td className="text-right"><Money value={Number(m.nAmount) || 0} plain /></td>
                        <td className="text-xs text-slate-500">{m.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Deleted Members" subtitle={`${deletedMembers.length} records`} />
            <CardBody className="!p-0">
              {deletedMembers.length === 0 ? (
                <div className="p-6"><EmptyState title={loading ? 'Loading…' : 'No deletions'} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable className="!border-0 !rounded-none">
                    <thead>
                      <tr><th>ID</th><th>Date</th><th>Number</th><th>Name</th><th>Aadhaar</th><th className="text-right">Amount</th></tr>
                    </thead>
                    <tbody>
                      {deletedMembers.map(m => (
                        <tr key={m.id}>
                          <td className="text-xs">{m.id}</td>
                          <td>{formatDate(m.date)}</td>
                          <td>{m.number}</td>
                          <td className="font-medium">{m.name}</td>
                          <td>{m.aadhaar || '—'}</td>
                          <td className="text-right"><Money value={Number(m.amount) || 0} tone="debit" plain /></td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Deleted Daybook" subtitle={`${deletedDaybook.length} records`} />
            <CardBody className="!p-0">
              {deletedDaybook.length === 0 ? (
                <div className="p-6"><EmptyState title={loading ? 'Loading…' : 'No deletions'} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable className="!border-0 !rounded-none">
                    <thead>
                      <tr><th>ID</th><th>Date</th><th>Account</th><th>Particulars</th><th>A/C #</th></tr>
                    </thead>
                    <tbody>
                      {deletedDaybook.map(e => (
                        <tr key={e.id}>
                          <td className="text-xs">{e.id}</td>
                          <td>{formatDate(e.ddate)}</td>
                          <td className="font-medium">{e.nameoftheAccount}</td>
                          <td className="max-w-[260px] truncate">{e.particulars}</td>
                          <td>{e.accountnumb || '—'}</td>
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
