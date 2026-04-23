'use client'

/**
 * Bundles the three new sections — Documents, Location, Description &
 * extra features — so the loan-entry form stays tidy.
 */

import { useMemo, useRef } from 'react'
import { Plus, Trash2, MapPin, Upload, Paperclip } from 'lucide-react'
import type { DocumentItem, LoanDocuments, LoanLocation } from '@/types'
import {
  Card, CardHeader, CardBody, Field, Input, Textarea, Button, Badge,
} from '@/components/ui'

const DEFAULT_FINANCIAL = ['Bank Statements', 'Income Proof / Salary Slips', 'IT Returns / GST']
const DEFAULT_ORIGINAL = ['Land Title / Patta', 'Property Deed', 'Vehicle / Asset Papers']
const DEFAULT_REGISTRATION = ['Joint Registration With Finance', 'Agreement / Bond', 'Photograph']

type Section = keyof LoanDocuments

export interface LoanExtrasValue {
  documents: LoanDocuments
  location: LoanLocation
  description: string
  extraFeatures: string
}

export function emptyLoanExtras(): LoanExtrasValue {
  return {
    documents: {
      financial: DEFAULT_FINANCIAL.map(title => ({ submitted: false, title, notes: '' })),
      original: DEFAULT_ORIGINAL.map(title => ({ submitted: false, title, notes: '' })),
      registration: DEFAULT_REGISTRATION.map(title => ({ submitted: false, title, notes: '' })),
    },
    location: {},
    description: '',
    extraFeatures: '',
  }
}

export default function LoanExtrasForm({
  value,
  onChange,
}: {
  value: LoanExtrasValue
  onChange: (next: LoanExtrasValue) => void
}) {
  const patch = (p: Partial<LoanExtrasValue>) => onChange({ ...value, ...p })
  const patchLocation = (p: Partial<LoanLocation>) =>
    patch({ location: { ...value.location, ...p } })

  function setDoc(section: Section, idx: number, next: Partial<DocumentItem>) {
    const list = [...value.documents[section]]
    list[idx] = { ...list[idx], ...next }
    patch({ documents: { ...value.documents, [section]: list } })
  }
  function addDoc(section: Section) {
    const list = [...value.documents[section], { submitted: true, title: '', notes: '' }]
    patch({ documents: { ...value.documents, [section]: list } })
  }
  function removeDoc(section: Section, idx: number) {
    const list = value.documents[section].filter((_, i) => i !== idx)
    patch({ documents: { ...value.documents, [section]: list } })
  }

  async function detectGPS() {
    if (!('geolocation' in navigator)) return alert('Geolocation not supported on this device')
    navigator.geolocation.getCurrentPosition(
      pos => {
        patchLocation({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          mapLink: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
        })
      },
      err => alert(`Could not detect GPS: ${err.message}`),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const counts = useMemo(() => ({
    financial: value.documents.financial.filter(d => d.submitted).length,
    original: value.documents.original.filter(d => d.submitted).length,
    registration: value.documents.registration.filter(d => d.submitted).length,
  }), [value.documents])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Documents submitted"
          subtitle="Record what the customer has physically handed over"
          actions={
            <div className="flex gap-1">
              <Badge tone="info">Fin · {counts.financial}</Badge>
              <Badge tone="info">Orig · {counts.original}</Badge>
              <Badge tone="info">Reg · {counts.registration}</Badge>
            </div>
          }
        />
        <CardBody className="space-y-5">
          <DocSection
            title="1. Financial documents"
            hint="Bank statements, income proof, IT returns, GST filings"
            items={value.documents.financial}
            onChange={(idx, next) => setDoc('financial', idx, next)}
            onAdd={() => addDoc('financial')}
            onRemove={idx => removeDoc('financial', idx)}
          />
          <DocSection
            title="2. Original documents (land, assets, etc.)"
            hint="Pattas, deeds, vehicle papers, jewellery receipts"
            items={value.documents.original}
            onChange={(idx, next) => setDoc('original', idx, next)}
            onAdd={() => addDoc('original')}
            onRemove={idx => removeDoc('original', idx)}
          />
          <DocSection
            title="3. Registration documents (joint registration, etc.)"
            hint="Joint registration on the finance company, stamp papers, bonds"
            items={value.documents.registration}
            onChange={(idx, next) => setDoc('registration', idx, next)}
            onAdd={() => addDoc('registration')}
            onRemove={idx => removeDoc('registration', idx)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Asset / collateral location"
          subtitle="Exact address + GPS of the pledged property or asset"
          actions={<Button onClick={detectGPS}><MapPin className="w-4 h-4" />Detect GPS</Button>}
        />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Address" className="sm:col-span-2">
              <Textarea rows={2} value={value.location.address || ''} onChange={e => patchLocation({ address: e.target.value })} placeholder="Door No., Street, Village / Town" />
            </Field>
            <Field label="Village / Town"><Input value={value.location.village || ''} onChange={e => patchLocation({ village: e.target.value })} /></Field>
            <Field label="Mandal"><Input value={value.location.mandal || ''} onChange={e => patchLocation({ mandal: e.target.value })} /></Field>
            <Field label="District"><Input value={value.location.district || ''} onChange={e => patchLocation({ district: e.target.value })} /></Field>
            <Field label="State"><Input value={value.location.state || ''} onChange={e => patchLocation({ state: e.target.value })} /></Field>
            <Field label="Pincode"><Input value={value.location.pincode || ''} onChange={e => patchLocation({ pincode: e.target.value })} /></Field>
            <Field label="Landmark" className="sm:col-span-2"><Input value={value.location.landmark || ''} onChange={e => patchLocation({ landmark: e.target.value })} placeholder="e.g. Next to Ramalayam temple" /></Field>
            <Field label="Latitude"><Input type="number" step="0.000001" value={value.location.latitude ?? ''} onChange={e => patchLocation({ latitude: e.target.value ? Number(e.target.value) : undefined })} /></Field>
            <Field label="Longitude"><Input type="number" step="0.000001" value={value.location.longitude ?? ''} onChange={e => patchLocation({ longitude: e.target.value ? Number(e.target.value) : undefined })} /></Field>
            <Field label="Google maps / plus-code link" className="sm:col-span-2">
              <Input value={value.location.mapLink || ''} onChange={e => patchLocation({ mapLink: e.target.value })} placeholder="Paste the Google Maps link" />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Description & extra features"
          subtitle="Anything special about this loan, that the admin wants to capture"
        />
        <CardBody className="space-y-4">
          <Field label="Description">
            <Textarea rows={4} value={value.description} onChange={e => patch({ description: e.target.value })} placeholder="Reason for borrowing, repayment arrangement, discussions with customer…" />
          </Field>
          <Field label="Extra features">
            <Textarea rows={3} value={value.extraFeatures} onChange={e => patch({ extraFeatures: e.target.value })} placeholder="Step-up EMIs, partial disbursal, waivers, special conditions, etc." />
          </Field>
        </CardBody>
      </Card>
    </div>
  )
}

function DocSection({
  title, hint, items, onChange, onAdd, onRemove,
}: {
  title: string
  hint?: string
  items: DocumentItem[]
  onChange: (idx: number, next: Partial<DocumentItem>) => void
  onAdd: () => void
  onRemove: (idx: number) => void
}) {
  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
        <Button onClick={onAdd}><Plus className="w-3.5 h-3.5" />Add</Button>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-slate-500 italic">None added — click Add to record a document.</p>
        ) : items.map((d, i) => (
          <DocRow
            key={i}
            d={d}
            onChange={next => onChange(i, next)}
            onRemove={() => onRemove(i)}
          />
        ))}
      </div>
    </div>
  )
}

/** One document row — checkbox + title + ref notes + optional file upload + delete. */
function DocRow({
  d,
  onChange,
  onRemove,
}: {
  d: DocumentItem
  onChange: (next: Partial<DocumentItem>) => void
  onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2.5 * 1024 * 1024) {
      alert('File too large (max 2.5 MB). Reduce size or paste a shared link instead.')
      e.target.value = ''
      return
    }
    // Read file as data URL so it saves with the loan record.
    const reader = new FileReader()
    reader.onload = () => {
      onChange({
        fileName: file.name,
        fileType: file.type,
        fileData: String(reader.result || ''),
        submitted: true,
      } as any)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <label className="col-span-1 flex items-center justify-center">
        <input
          type="checkbox"
          checked={d.submitted}
          onChange={e => onChange({ submitted: e.target.checked })}
          className="w-4 h-4"
        />
      </label>
      <Input
        className="col-span-3"
        value={d.title || ''}
        onChange={e => onChange({ title: e.target.value })}
        placeholder="Document title"
      />
      <Input
        className="col-span-5"
        value={d.notes || ''}
        onChange={e => onChange({ notes: e.target.value })}
        placeholder="Ref no., authority, remarks…"
      />
      <div className="col-span-2 flex items-center gap-1">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex-1 inline-flex items-center justify-center gap-1 h-9 px-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
          aria-label="Upload file"
          title={(d as any).fileName || 'Upload file'}
        >
          {(d as any).fileData ? <Paperclip className="w-3.5 h-3.5 text-emerald-600" /> : <Upload className="w-3.5 h-3.5" />}
          <span className="truncate max-w-[80px]">{(d as any).fileName || 'Upload'}</span>
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="col-span-1 inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-200 text-rose-600 hover:bg-rose-50"
        aria-label="Remove document"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
