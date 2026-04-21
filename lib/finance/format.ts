/**
 * Number, currency, and date formatting — used everywhere.
 * Indian locale, INR, DD-MMM-YY style (matches legacy reports).
 */

export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

export function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^0-9.\-]/g, '')
    const parsed = parseFloat(cleaned)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

/** Indian grouping: 12,34,567.89 */
const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const INR_PLAIN = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatINR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n as number)) return '₹0'
  return INR.format(n as number)
}

export function formatAmount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n as number)) return '0'
  return INR_PLAIN.format(n as number)
}

export function formatPercent(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n as number)) return '0%'
  return `${(n as number).toFixed(digits).replace(/\.?0+$/, '')}%`
}

/** DD-MMM-YY (e.g. 20-Apr-26) */
export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T00:00:00' : d) : d
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')
}

/** YYYY-MM-DD (for inputs and DB) */
export function toISODate(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T00:00:00' : d) : d
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export function diffDays(from: string | Date, to: string | Date): number {
  const a = typeof from === 'string' ? new Date(from + (from.length === 10 ? 'T00:00:00' : '')) : from
  const b = typeof to === 'string' ? new Date(to + (to.length === 10 ? 'T00:00:00' : '')) : to
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000))
}

export function addDays(d: string | Date, days: number): Date {
  const base = typeof d === 'string' ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')) : new Date(d)
  base.setDate(base.getDate() + days)
  return base
}

export function addMonths(d: string | Date, months: number): Date {
  const base = typeof d === 'string' ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')) : new Date(d)
  base.setMonth(base.getMonth() + months)
  return base
}
