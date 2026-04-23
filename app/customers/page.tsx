'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, RefreshCw, Printer } from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, Button, Input,
  DataTable, EmptyState, Badge,
} from '@/components/ui'

interface Customer {
  id: string
  customerId: number
  aadhaar?: string
  name: string
  father?: string
  address: string
  village?: string
  mandal?: string
  district?: string
  phone1?: string
  phone2?: string
  imageUrl?: string
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/customers')
      const d = await r.json().catch(() => [])
      setCustomers(Array.isArray(d) ? d : [])
    } catch { setCustomers([]) } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q) ||
      c.phone1?.includes(q) ||
      c.phone2?.includes(q) ||
      c.aadhaar?.includes(q) ||
      c.village?.toLowerCase().includes(q) ||
      c.mandal?.toLowerCase().includes(q) ||
      c.district?.toLowerCase().includes(q)
    )
  }, [customers, search])

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} on file`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Customers' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={load} disabled={loading}><RefreshCw className="w-4 h-4" />{loading ? '…' : 'Refresh'}</Button>
            <Button onClick={() => window.print()}><Printer className="w-4 h-4" />Print</Button>
            <Button variant="primary" onClick={() => router.push('/customers/new')}><Plus className="w-4 h-4" />New</Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader
            title="Search"
            subtitle="Name, address, phone, Aadhaar, village / mandal / district"
            actions={<Badge tone="info">{filtered.length} / {customers.length}</Badge>}
          />
          <CardBody>
            <Input placeholder="Type to filter…" value={search} onChange={e => setSearch(e.target.value)} />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="!p-0">
            {filtered.length === 0 ? (
              <div className="p-6"><EmptyState title="No customers" description={customers.length === 0 ? 'Add your first customer from the New Customer page.' : 'No matches for this query.'} /></div>
            ) : (
              <div className="overflow-x-auto">
                <DataTable className="!border-0 !rounded-none">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Father</th>
                      <th>Address</th>
                      <th>Village</th>
                      <th>Mandal</th>
                      <th>District</th>
                      <th>Phone 1</th>
                      <th>Phone 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.id}>
                        <td>{c.customerId}</td>
                        <td className="font-medium text-slate-900">{c.name}</td>
                        <td>{c.father || '—'}</td>
                        <td className="max-w-[240px] truncate">{c.address}</td>
                        <td>{c.village || '—'}</td>
                        <td>{c.mandal || '—'}</td>
                        <td>{c.district || '—'}</td>
                        <td>{c.phone1 || '—'}</td>
                        <td>{c.phone2 || '—'}</td>
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
  )
}
