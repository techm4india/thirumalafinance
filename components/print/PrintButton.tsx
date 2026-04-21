'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui'

/**
 * Reusable "Print" button — calls window.print() which CSS media queries
 * pick up via `@media print` in globals.css to drop chrome and print the
 * `.loan-sheet` / `.print-card` areas.
 */
export default function PrintButton({
  label = 'Print',
  variant = 'primary' as 'primary' | 'secondary' | 'success' | 'danger',
  onBeforePrint,
  className,
}: {
  label?: string
  variant?: 'primary' | 'secondary' | 'success' | 'danger'
  onBeforePrint?: () => void
  className?: string
}) {
  function print() {
    try { onBeforePrint?.() } catch {}
    // Let React flush first.
    setTimeout(() => window.print(), 50)
  }
  return (
    <Button className={className} variant={variant as any} onClick={print}>
      <Printer className="w-4 h-4" />{label}
    </Button>
  )
}
