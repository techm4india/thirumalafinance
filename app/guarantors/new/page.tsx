'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, RotateCcw } from 'lucide-react'
import CustomerImageUpload from '@/components/CustomerImageUpload'
import {
  PageHeader, Card, CardHeader, CardBody, Field, Input, Textarea, Button,
} from '@/components/ui'

interface Guarantor {
  id?: string
  guarantorId: number
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

export default function NewGuarantorPage() {
  const router = useRouter()
  const [form, setForm] = useState<Partial<Guarantor>>({ guarantorId: 1 })
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resetTrigger, setResetTrigger] = useState(0)

  useEffect(() => { fetchNext() }, [])

  async function fetchNext() {
    try {
      const r = await fetch('/api/guarantors?nextId=true')
      if (r.ok) {
        const d = await r.json()
        setForm(p => ({ ...p, guarantorId: d.nextGuarantorId || 1 }))
      }
    } catch {}
  }

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.name?.trim()) return alert('Please enter guarantor name')
    if (!form.address?.trim()) return alert('Please enter address')

    const isPreview = form.imageUrl?.startsWith('data:image') ?? false
    setSaving(true)
    try {
      const payload = { ...form, imageUrl: isPreview ? undefined : form.imageUrl }
      const r = await fetch('/api/guarantors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        alert(`Error: ${e.error || e.message || 'Save failed'}`); return
      }
      const saved = await r.json()
      const id = saved.guarantor?.id || saved.id
      if (id) setSavedId(id)

      if (isPreview && form.imageUrl && id) {
        try {
          const base64 = form.imageUrl.split(',')[1]
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
          const file = new File([bytes], `guarantor-${Date.now()}.jpg`, { type: 'image/jpeg' })
          const fd = new FormData(); fd.append('file', file)
          const up = await fetch(`/api/guarantors/${id}/images`, { method: 'POST', body: fd })
          if (!up.ok) {
            const e = await up.json().catch(() => ({}))
            alert(`Saved, but image upload failed: ${e.error || 'unknown'}`)
          } else {
            alert('Guarantor and photo saved')
          }
        } catch (e: any) {
          alert(`Saved, but image upload failed: ${e?.message || 'unknown'}`)
        }
      } else {
        alert('Guarantor saved')
      }

      await fetchNext()
      setResetTrigger(x => x + 1)
      setForm(p => ({ guarantorId: p.guarantorId }))
      setSavedId(null)
    } catch {
      alert('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(file: File): Promise<string> {
    if (savedId) {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch(`/api/guarantors/${savedId}/images`, { method: 'POST', body: fd })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error(e.error || 'Upload failed')
      }
      const d = await r.json()
      setForm(p => ({ ...p, imageUrl: d.url }))
      return d.url
    }
    // Unsaved yet — preview only, will upload on save
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const url = reader.result as string
        setForm(p => ({ ...p, imageUrl: url }))
        resolve(url)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleImageDelete() {
    if (savedId && form.imageUrl && !form.imageUrl.startsWith('data:')) {
      const r = await fetch(`/api/guarantors/${savedId}/images`, { method: 'DELETE' })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error(e.error || 'Delete failed')
      }
    }
    setForm(p => ({ ...p, imageUrl: undefined }))
  }

  async function handleReset() {
    await fetchNext()
    setResetTrigger(x => x + 1)
    setForm(p => ({ guarantorId: p.guarantorId }))
    setSavedId(null)
  }

  return (
    <div>
      <PageHeader
        title="New Guarantor"
        subtitle="Guarantors co-sign loans. Attach a photo if available."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Guarantors' }, { label: 'New' }]}
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
          <CardHeader title="Guarantor details" />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Guarantor ID"><Input type="number" value={form.guarantorId ?? ''} readOnly disabled /></Field>
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
          <CardHeader title="Guarantor photo" subtitle={savedId ? 'Saves directly' : 'Uploads on save'} />
          <CardBody>
            <CustomerImageUpload
              imageUrl={form.imageUrl}
              onUpload={handleImageUpload}
              onDelete={handleImageDelete}
              label="Guarantor Photo"
              customerId={savedId || undefined}
              className="w-full"
              resetTrigger={resetTrigger}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
