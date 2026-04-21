'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, RotateCcw, X } from 'lucide-react'
import CustomerImageUpload from '@/components/CustomerImageUpload'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Textarea, Button,
} from '@/components/ui'

interface Customer {
  id?: string
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

export default function NewCustomerPage() {
  const router = useRouter()
  const [form, setForm] = useState<Partial<Customer>>({ customerId: 1 })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [saving, setSaving] = useState(false)
  const [resetTrigger, setResetTrigger] = useState(0)

  useEffect(() => { fetchAll(); fetchNext() }, [])

  async function fetchAll() {
    try {
      const r = await fetch('/api/customers')
      const d = await r.json().catch(() => [])
      setCustomers(Array.isArray(d) ? d : [])
    } catch {}
  }

  async function fetchNext() {
    try {
      const r = await fetch('/api/customers?nextId=true')
      if (r.ok) {
        const d = await r.json()
        setForm(p => ({ ...p, customerId: d.nextCustomerId || 1 }))
      }
    } catch {
      if (customers.length > 0) {
        const max = Math.max(...customers.map(c => c.customerId || 0), 0)
        setForm(p => ({ ...p, customerId: max + 1 }))
      }
    }
  }

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.name?.trim()) return alert('Please enter customer name')
    if (!form.address?.trim()) return alert('Please enter address')
    setSaving(true)
    try {
      const r = await fetch('/api/customers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (r.ok) {
        alert('Customer saved')
        await fetchAll(); await fetchNext()
        setForm(p => ({ customerId: p.customerId }))
        setResetTrigger(x => x + 1)
      } else {
        const e = await r.json().catch(() => ({}))
        alert(`Error: ${e.error || e.message || 'Save failed'}`)
      }
    } catch { alert('Network error') }
    finally { setSaving(false) }
  }

  async function handleImageUpload(file: File): Promise<string> {
    let id = form.id
    if (!id) {
      if (!form.name?.trim()) throw new Error('Enter name before uploading photo')
      if (!form.address?.trim()) throw new Error('Enter address before uploading photo')
      const r = await fetch('/api/customers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error(e.error || 'Failed to save customer')
      }
      const saved = await r.json()
      id = saved.customer?.id || saved.id || saved.customerId
      if (!id) throw new Error('Customer saved but id missing')
      setForm(p => ({ ...p, id }))
      await new Promise(res => setTimeout(res, 200))
    }
    const fd = new FormData(); fd.append('file', file)
    const r = await fetch(`/api/customers/${id}/images`, { method: 'POST', body: fd })
    if (!r.ok) {
      const e = await r.json().catch(() => ({}))
      throw new Error(e.error || 'Failed to upload image')
    }
    const d = await r.json()
    if (!d.url) throw new Error('Upload succeeded but URL missing')
    setForm(p => ({ ...p, imageUrl: d.url }))
    return d.url
  }

  async function handleImageDelete() {
    if (!form.id) return
    const r = await fetch(`/api/customers/${form.id}/images`, { method: 'DELETE' })
    if (!r.ok) {
      const e = await r.json().catch(() => ({}))
      throw new Error(e.error || 'Delete failed')
    }
    setForm(p => ({ ...p, imageUrl: undefined }))
  }

  async function handleReset() {
    await fetchNext()
    setForm(p => ({ customerId: p.customerId }))
    setResetTrigger(x => x + 1)
  }

  return (
    <div>
      <PageHeader
        title="New Customer"
        subtitle="Register a new customer in the master list"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Customers', href: '/customers' }, { label: 'New' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={handleReset}><RotateCcw className="w-4 h-4" />Reset</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      />

      <div className="p-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Customer details" />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Customer ID"><Input type="number" value={form.customerId ?? ''} readOnly disabled /></Field>
              <Field label="Aadhaar"><Input value={form.aadhaar || ''} maxLength={12} onChange={e => set('aadhaar', e.target.value)} /></Field>
              <Field label="Name" required className="sm:col-span-2">
                <Input value={form.name || ''} onChange={e => set('name', e.target.value)} />
              </Field>
              <Field label="Father"><Input value={form.father || ''} onChange={e => set('father', e.target.value)} /></Field>
              <Field label="Village"><Input value={form.village || ''} onChange={e => set('village', e.target.value)} /></Field>
              <Field label="Mandal"><Input value={form.mandal || ''} onChange={e => set('mandal', e.target.value)} /></Field>
              <Field label="District"><Input value={form.district || ''} onChange={e => set('district', e.target.value)} /></Field>
              <Field label="Address" required className="sm:col-span-2">
                <Textarea rows={2} value={form.address || ''} onChange={e => set('address', e.target.value)} />
              </Field>
              <Field label="Phone 1"><Input type="tel" value={form.phone1 || ''} onChange={e => set('phone1', e.target.value)} /></Field>
              <Field label="Phone 2"><Input type="tel" value={form.phone2 || ''} onChange={e => set('phone2', e.target.value)} /></Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Customer photo" subtitle="Upload or capture. Saved with customer record." />
          <CardBody>
            <CustomerImageUpload
              imageUrl={form.imageUrl}
              onUpload={handleImageUpload}
              onDelete={form.id ? handleImageDelete : undefined}
              label="Customer Photo"
              customerId={form.id}
              className="w-full"
              resetTrigger={resetTrigger}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
