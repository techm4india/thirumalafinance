'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react'
import type { Partner } from '@/types'
import {
  PageHeader, Card, CardHeader, CardBody, Button, Input, Badge,
  DataTable, EmptyState,
} from '@/components/ui'

interface PartnerRow extends Partner {
  partnerId?: number
  isMD?: boolean
  mdName?: string
  village?: string
  homePhone?: string
}

export default function PartnersPage() {
  const router = useRouter()
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/partners')
      const d = await r.json().catch(() => [])
      setPartners(Array.isArray(d) ? d : [])
    } catch { setPartners([]) } finally { setLoading(false) }
  }

  const filter = (rows: PartnerRow[]) => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.mdName?.toLowerCase().includes(q) ||
      p.village?.toLowerCase().includes(q) ||
      (p.homePhone || p.phone || '').includes(q)
    )
  }

  const all = useMemo(() => filter(partners), [partners, search])
  const mds = useMemo(() => {
    const md = partners.filter(p => p.isMD)
    return filter(md.length ? md : partners)
  }, [partners, search])

  function Table({ rows }: { rows: PartnerRow[] }) {
    if (rows.length === 0) return <EmptyState title="No partners" description="No rows match this filter." />
    return (
      <DataTable className="!border-0 !rounded-none">
        <thead>
          <tr>
            <th>ID</th>
            <th>Partner</th>
            <th>MD</th>
            <th>MD Name</th>
            <th>Village</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id}>
              <td>{p.partnerId || '—'}</td>
              <td className="font-medium text-slate-900">{p.name}</td>
              <td>{p.isMD ? <Badge tone="info">MD</Badge> : <span className="text-slate-400">—</span>}</td>
              <td>{p.mdName || '—'}</td>
              <td>{p.village || '—'}</td>
              <td>{p.homePhone || p.phone || '—'}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    )
  }

  return (
    <div>
      <PageHeader
        title="Partners"
        subtitle={`${partners.length} registered · ${partners.filter(p => p.isMD).length} MDs`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Partners' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={load} disabled={loading}><RefreshCw className="w-4 h-4" />{loading ? '…' : 'Refresh'}</Button>
            <Button variant="primary" onClick={() => router.push('/partners/new')}><Plus className="w-4 h-4" />New Partner</Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader title="Search" subtitle="Name, MD, village, phone" />
          <CardBody>
            <Input placeholder="Type to filter…" value={search} onChange={e => setSearch(e.target.value)} />
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="All partners" subtitle={`${all.length} rows`} />
            <CardBody className="!p-0"><div className="overflow-x-auto"><Table rows={all} /></div></CardBody>
          </Card>

          <Card>
            <CardHeader title="MDs only" subtitle={`${mds.length} rows`} />
            <CardBody className="!p-0"><div className="overflow-x-auto"><Table rows={mds} /></div></CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
