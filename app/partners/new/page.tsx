'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, RotateCcw } from 'lucide-react'
import type { Partner } from '@/types'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Textarea, Button, Badge,
} from '@/components/ui'

interface PartnerForm extends Partial<Partner> {
  partnerId?: number
  isMD?: boolean
  mdName?: string
  village?: string
  homePhone?: string
}

export default function NewPartnerPage() {
  const router = useRouter()
  const [form, setForm] = useState<PartnerForm>({ partnerId: 1, isMD: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchNext() }, [])

  async function fetchNext() {
    try {
      const r = await fetch('/api/partners?nextId=true')
      if (r.ok) {
        const d = await r.json()
        setForm(p => ({ ...p, partnerId: d.nextPartnerId || 1 }))
      }
    } catch {}
  }

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.name?.trim()) return alert('Please enter partner name')
    setSaving(true)
    try {
      const r = await fetch('/api/partners', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (r.ok) {
        alert('Partner saved')
        await fetchNext()
        setForm(p => ({ partnerId: p.partnerId, isMD: false }))
      } else {
        const e = await r.json().catch(() => ({}))
        alert(`Error: ${e.error || e.message || 'Save failed'}`)
      }
    } catch { alert('Network error') }
    finally { setSaving(false) }
  }

  async function handleReset() {
    await fetchNext()
    setForm(p => ({ partnerId: p.partnerId, isMD: false }))
  }

  return (
    <div>
      <PageHeader
        title="New Partner"
        subtitle="Register a partner or MD who sources business"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Partners', href: '/partners' }, { label: 'New' }]}
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

      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader
            title="Partner details"
            actions={form.isMD ? <Badge tone="info">MD</Badge> : undefined}
          />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Partner ID">
                <Input type="number" value={form.partnerId ?? ''} readOnly disabled />
              </Field>
              <Field label="Role">
                <label className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-200 bg-white">
                  <input type="checkbox" checked={!!form.isMD} onChange={e => set('isMD', e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm text-slate-700">Is MD?</span>
                </label>
              </Field>
              <Field label="Name" required className="sm:col-span-2">
                <Input value={form.name || ''} onChange={e => set('name', e.target.value)} />
              </Field>
              <Field label="Phone"><Input type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></Field>
              <Field label="Home Phone"><Input type="tel" value={form.homePhone || ''} onChange={e => set('homePhone', e.target.value)} /></Field>
              <Field label="Village"><Input value={form.village || ''} onChange={e => set('village', e.target.value)} /></Field>
              <Field label="MD Name"><Input value={form.mdName || ''} onChange={e => set('mdName', e.target.value)} /></Field>
              <Field label="Address" className="sm:col-span-2">
                <Textarea rows={2} value={form.address || ''} onChange={e => set('address', e.target.value)} />
              </Field>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
