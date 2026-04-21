'use client'

/**
 * Settings → Ledgers
 *
 * Per-ledger interest customization. Every value saved here flows through
 * getEffectiveRule() → all ledger pages, reports, dashboard, and the
 * calculator pick up the new rates automatically.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RotateCcw, Save } from 'lucide-react'
import type { LoanType } from '@/types'
import {
  PageHeader, Card, CardHeader, CardBody, Button, Field, Input, Select,
  Badge, InfoGrid,
} from '@/components/ui'
import {
  LEDGER_RULES, getAllOverrides, setAllOverrides,
  type LedgerOverride, type InterestMethod,
} from '@/lib/finance'

const CODES: LoanType[] = ['CD', 'HP', 'STBD', 'TBD', 'FD', 'OD', 'RD']

const METHODS: { value: InterestMethod; label: string }[] = [
  { value: 'simple_daily',     label: 'Simple daily' },
  { value: 'flat_emi',         label: 'Flat EMI' },
  { value: 'compound_monthly', label: 'Compound monthly' },
  { value: 'simple_monthly',   label: 'Simple monthly' },
]

type DraftRow = LedgerOverride & { enabled: boolean }
type Draft = Record<string, DraftRow>

function emptyRow(): DraftRow {
  return { enabled: false }
}

export default function LedgerSettingsPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(() => {
    const init: Draft = {}
    for (const c of CODES) init[c] = emptyRow()
    return init
  })
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<string>('')

  // Load from API + merge with any local cache
  useEffect(() => {
    const local = getAllOverrides()
    fetch('/api/settings/ledgers')
      .then(r => r.ok ? r.json() : {})
      .then(server => {
        const merged: Partial<Record<LoanType, LedgerOverride>> = { ...local, ...server }
        const next: Draft = {}
        for (const c of CODES) {
          const o = merged[c]
          next[c] = o
            ? { enabled: true, ...o }
            : emptyRow()
        }
        setDraft(next)
      })
      .catch(() => {
        const next: Draft = {}
        for (const c of CODES) {
          const o = local[c]
          next[c] = o ? { enabled: true, ...o } : emptyRow()
        }
        setDraft(next)
      })
  }, [])

  function setField<K extends keyof DraftRow>(code: string, key: K, value: DraftRow[K]) {
    setDraft(d => ({ ...d, [code]: { ...d[code], [key]: value } }))
  }

  function enableAll(v: boolean) {
    setDraft(d => {
      const next: Draft = {}
      for (const c of CODES) next[c] = { ...d[c], enabled: v }
      return next
    })
  }

  function resetToDefaults() {
    if (!confirm('Clear all custom settings and revert to built-in defaults?')) return
    const next: Draft = {}
    for (const c of CODES) next[c] = emptyRow()
    setDraft(next)
    setAllOverrides({})
    fetch('/api/settings/ledgers', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => {})
    setFlash('Reverted to defaults')
    setTimeout(() => setFlash(''), 2500)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload: Partial<Record<LoanType, LedgerOverride>> = {}
      for (const c of CODES) {
        const r = draft[c]
        if (!r?.enabled) continue
        const out: LedgerOverride = {}
        if (r.rate !== undefined && r.rate !== null && !Number.isNaN(r.rate)) out.rate = Number(r.rate)
        if (r.overdueRate !== undefined && r.overdueRate !== null && !Number.isNaN(r.overdueRate)) out.overdueRate = Number(r.overdueRate)
        if (r.method) out.method = r.method
        if (r.daysPerYear) out.daysPerYear = r.daysPerYear
        if (r.principalRollsOnRenewal !== undefined) out.principalRollsOnRenewal = r.principalRollsOnRenewal
        if (Object.keys(out).length > 0) payload[c as LoanType] = out
      }
      setAllOverrides(payload)

      const res = await fetch('/api/settings/ledgers', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json().catch(() => ({}))
      if (j?.persisted === false && j?.warning) {
        setFlash(`Saved locally (DB: ${j.warning})`)
      } else {
        setFlash('Settings saved · applies everywhere')
      }
    } catch (e: any) {
      setFlash(`Saved locally only · ${e?.message ?? 'offline'}`)
    } finally {
      setSaving(false)
      setTimeout(() => setFlash(''), 3500)
    }
  }

  const activeCount = useMemo(
    () => CODES.filter(c => draft[c]?.enabled).length,
    [draft]
  )

  return (
    <div>
      <PageHeader
        title="Ledger Settings"
        subtitle="Customize interest, overdue rate, and method for each ledger. Changes apply everywhere."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Settings' }, { label: 'Ledgers' }]}
        actions={
          <>
            <Button onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={resetToDefaults}><RotateCcw className="w-4 h-4" />Reset</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader
            title="How this works"
            subtitle="Every calc across ledgers, reports, dashboard, and the calculator reads these values."
            actions={<Badge tone="info">{activeCount} active</Badge>}
          />
          <CardBody>
            <InfoGrid columns={3} items={[
              { label: 'Base config', value: 'Built-in (fallback)' },
              { label: 'Override', value: 'Your settings above' },
              { label: 'Persistence', value: 'Supabase + browser cache' },
            ]} />
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={() => enableAll(true)}>Enable all</Button>
              <Button onClick={() => enableAll(false)}>Disable all</Button>
              {flash && <span className="text-sm text-emerald-700 font-medium">{flash}</span>}
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {CODES.map(code => {
            const base = LEDGER_RULES[code]
            const row = draft[code] || emptyRow()
            const toneColor = row.enabled ? 'info' : 'muted'
            return (
              <Card key={code}>
                <CardHeader
                  title={base.label}
                  subtitle={base.description}
                  actions={
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={!!row.enabled}
                        onChange={e => setField(code, 'enabled', e.target.checked)}
                      />
                      Customize
                      <Badge tone={toneColor as any}>{row.enabled ? 'Override' : 'Default'}</Badge>
                    </label>
                  }
                />
                <CardBody>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={`Rate (% / month) · default ${base.defaultRate}`}>
                      <Input
                        type="number" step="0.01" disabled={!row.enabled}
                        value={row.rate ?? ''}
                        onChange={e => setField(code, 'rate', e.target.value === '' ? undefined : Number(e.target.value))}
                        placeholder={`${base.defaultRate}`}
                      />
                    </Field>
                    <Field label={`Overdue (% / month) · default ${base.defaultOverdueRate}`}>
                      <Input
                        type="number" step="0.01" disabled={!row.enabled}
                        value={row.overdueRate ?? ''}
                        onChange={e => setField(code, 'overdueRate', e.target.value === '' ? undefined : Number(e.target.value))}
                        placeholder={`${base.defaultOverdueRate}`}
                      />
                    </Field>
                    <Field label={`Method · default ${base.method}`}>
                      <Select
                        disabled={!row.enabled}
                        value={row.method ?? ''}
                        onChange={e => setField(code, 'method', (e.target.value || undefined) as InterestMethod | undefined)}
                      >
                        <option value="">Default ({base.method})</option>
                        {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </Select>
                    </Field>
                    <Field label={`Days / year · default ${base.daysPerYear}`}>
                      <Select
                        disabled={!row.enabled}
                        value={row.daysPerYear ?? ''}
                        onChange={e => setField(code, 'daysPerYear', e.target.value === '' ? undefined : (Number(e.target.value) as 365 | 360))}
                      >
                        <option value="">Default ({base.daysPerYear})</option>
                        <option value="365">365</option>
                        <option value="360">360</option>
                      </Select>
                    </Field>
                    <Field label="Principal rolls on renewal" className="sm:col-span-2">
                      <Select
                        disabled={!row.enabled}
                        value={row.principalRollsOnRenewal === undefined ? '' : row.principalRollsOnRenewal ? 'yes' : 'no'}
                        onChange={e => {
                          const v = e.target.value
                          setField(code, 'principalRollsOnRenewal',
                            v === '' ? undefined : v === 'yes')
                        }}
                      >
                        <option value="">Default ({base.principalRollsOnRenewal ? 'Yes' : 'No'})</option>
                        <option value="yes">Yes — rolls forward</option>
                        <option value="no">No — settled each cycle</option>
                      </Select>
                    </Field>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader title="Schema hint" subtitle="If Supabase shows a warning when saving, create this table once." />
          <CardBody>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto text-slate-700">
{`create table if not exists ledger_settings (
  code text primary key,
  rate numeric,
  overdue_rate numeric,
  method text,
  days_per_year integer,
  principal_rolls_on_renewal boolean,
  updated_at timestamptz default now()
);`}
            </pre>
            <p className="text-xs text-slate-500 mt-2">Until this table exists, settings stay in your browser and still drive every calc in the UI.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
