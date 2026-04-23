/**
 * Shared UI primitives for Tirumala Finance.
 *
 * Use these everywhere instead of inlining Tailwind — that's how we kill
 * overlaps, clumsy spacing, and inconsistent colors in one shot.
 */
'use client'

import React from 'react'
import { formatINR, formatAmount } from '@/lib/finance'

// ─────────────────────────────────────────── cn helper
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

// ─────────────────────────────────────────── Card
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('app-card print-card', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('app-card-header', className)}>
      <div>
        {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('app-card-body', className)}>{children}</div>
}

// ─────────────────────────────────────────── Section
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-3', className)}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-500">{title}</h2>}
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

// ─────────────────────────────────────────── PageHeader
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  actions?: React.ReactNode
}) {
  return (
    <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="px-6 py-4 flex items-start justify-between gap-4 max-w-[1600px] mx-auto">
        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              {breadcrumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-slate-300">/</span>}
                  {c.href ? (
                    <a href={c.href} className="hover:text-slate-700">{c.label}</a>
                  ) : (
                    <span>{c.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
          <h1 className="text-xl font-semibold text-slate-900 truncate">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────── Button
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
export function Button({
  variant = 'secondary',
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const cls =
    variant === 'primary'   ? 'app-btn-primary'
  : variant === 'danger'    ? 'app-btn-danger'
  : variant === 'success'   ? 'app-btn-success'
  : variant === 'ghost'     ? 'app-btn text-slate-700 hover:bg-slate-100'
  :                           'app-btn-secondary'
  return <button className={cn(cls, className)} {...rest}>{children}</button>
}

// ─────────────────────────────────────────── Input / Select / Field
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <label className="app-label flex items-center gap-1">
          {label}
          {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-rose-600 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-400 mt-1">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type, value, ...rest }, ref) {
    // For number inputs, hide a literal 0/"0" default so admins don't have to
    // clear the field before typing. Empty string renders as placeholder.
    let v: any = value
    if (type === 'number' && (v === 0 || v === '0')) v = ''
    return <input ref={ref} type={type} value={v} className={cn('app-input', className)} {...rest} />
  }
)

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return <select ref={ref} className={cn('app-input pr-8', className)} {...rest}>{children}</select>
  }
)

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn('app-input min-h-[80px]', className)} {...rest} />
  }
)

// ─────────────────────────────────────────── Badge
export function Badge({
  tone = 'muted',
  children,
  className,
}: {
  tone?: 'credit' | 'debit' | 'warn' | 'info' | 'muted'
  children: React.ReactNode
  className?: string
}) {
  const cls =
    tone === 'credit' ? 'app-badge-credit'
  : tone === 'debit'  ? 'app-badge-debit'
  : tone === 'warn'   ? 'app-badge-warn'
  : tone === 'info'   ? 'app-badge-info'
  :                     'app-badge-muted'
  return <span className={cn(cls, className)}>{children}</span>
}

// ─────────────────────────────────────────── Money display
export function Money({
  value,
  tone,
  className,
  plain,
}: {
  value: number | null | undefined
  tone?: 'credit' | 'debit' | 'muted' | 'auto'
  className?: string
  plain?: boolean // if true, no ₹ symbol
}) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  const auto = tone === 'auto' ? (n > 0 ? 'credit' : n < 0 ? 'debit' : 'muted') : tone
  const color =
    auto === 'credit' ? 'text-emerald-700'
  : auto === 'debit'  ? 'text-rose-700'
  : auto === 'muted'  ? 'text-slate-500'
  :                     'text-slate-900'
  return (
    <span className={cn('tabular font-medium', color, className)}>
      {plain ? formatAmount(n) : formatINR(n)}
    </span>
  )
}

// ─────────────────────────────────────────── StatCard — KPI tile
export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
}: {
  label: React.ReactNode
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: 'neutral' | 'credit' | 'debit' | 'warn' | 'info'
  icon?: React.ReactNode
}) {
  const accent =
    tone === 'credit' ? 'ring-emerald-100 bg-emerald-50 text-emerald-700'
  : tone === 'debit'  ? 'ring-rose-100 bg-rose-50 text-rose-700'
  : tone === 'warn'   ? 'ring-amber-100 bg-amber-50 text-amber-700'
  : tone === 'info'   ? 'ring-sky-100 bg-sky-50 text-sky-700'
  :                     'ring-slate-100 bg-slate-50 text-slate-700'
  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
          {icon && (
            <div className={cn('h-8 w-8 rounded-lg grid place-items-center ring-1', accent)}>{icon}</div>
          )}
        </div>
        <div className="mt-2 text-2xl font-semibold tabular text-slate-900">{value}</div>
        {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────── Empty / Loading / Error
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="text-center py-12 px-6 border border-dashed border-slate-200 rounded-xl bg-white">
      {icon && <div className="mx-auto mb-3 h-10 w-10 grid place-items-center rounded-lg bg-slate-50 text-slate-400">{icon}</div>}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3"><div className="h-3 bg-slate-100 rounded animate-pulse" /></td>
      ))}
    </tr>
  )
}

// ─────────────────────────────────────────── Data table shell
export function DataTable({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('overflow-x-auto scrollbar-thin rounded-xl border border-slate-200 bg-white', className)}>
      <table className="app-table">{children}</table>
    </div>
  )
}

// ─────────────────────────────────────────── DL — label/value list
export function InfoGrid({
  items,
  columns = 2,
}: {
  items: Array<{ label: React.ReactNode; value: React.ReactNode }>
  columns?: 1 | 2 | 3 | 4
}) {
  const cols =
    columns === 1 ? 'grid-cols-1'
  : columns === 2 ? 'grid-cols-1 sm:grid-cols-2'
  : columns === 3 ? 'grid-cols-1 sm:grid-cols-3'
  :                 'grid-cols-2 sm:grid-cols-4'
  return (
    <dl className={cn('grid gap-x-6 gap-y-3', cols)}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs text-slate-500">{it.label}</dt>
          <dd className="text-sm font-medium text-slate-900 truncate">{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}
