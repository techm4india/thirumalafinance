import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { DatabaseConfigBanner } from '@/components/DatabaseConfigBanner'
import { AppShell } from '@/components/AppShell'
import { LedgerSettingsHydrator } from '@/components/LedgerSettingsHydrator'
import { LoginGate } from '@/components/LoginGate'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tirumala Finance — Chitfund Management',
  description:
    'Production finance management for chitfund operations — loans, ledgers, cashbook, and reports.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LoginGate>
          <DatabaseConfigBanner />
          <LedgerSettingsHydrator />
          <AppShell>{children}</AppShell>
        </LoginGate>
      </body>
    </html>
  )
}
