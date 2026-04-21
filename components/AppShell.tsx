'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Edit3, Users, UserPlus, Book, DollarSign,
  Search as SearchIcon, Calculator as CalcIcon, Receipt, CreditCard,
  BookOpen, Calendar, TrendingUp, BarChart3, ShieldCheck, Menu, X,
  Settings as SettingsIcon,
} from 'lucide-react'
import { cn } from '@/components/ui'

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }> }

const GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard',        href: '/',                 icon: LayoutDashboard },
    ],
  },
  {
    title: 'Entries',
    items: [
      { label: 'New Loan',         href: '/loans/new',        icon: FileText },
      { label: 'Edit Loan',        href: '/loans/edit',       icon: Edit3 },
      { label: 'New Customer',     href: '/customers/new',    icon: UserPlus },
      { label: 'Customers',        href: '/customers',        icon: Users },
      { label: 'New Guarantor',    href: '/guarantors/new',   icon: ShieldCheck },
      { label: 'New Partner',      href: '/partners/new',     icon: UserPlus },
      { label: 'Partners',         href: '/partners',         icon: Users },
      { label: 'Cash Book',        href: '/cashbook',         icon: Book },
      { label: 'Capital Entry',    href: '/capital',          icon: DollarSign },
      { label: 'Calculator',       href: '/calculator',       icon: CalcIcon },
      { label: 'Search',           href: '/search',           icon: SearchIcon },
    ],
  },
  {
    title: 'Ledgers',
    items: [
      { label: 'CD Ledger',        href: '/reports/cd-ledger',   icon: CreditCard },
      { label: 'HP Ledger',        href: '/reports/hp-ledger',   icon: Receipt },
      { label: 'STBD Ledger',      href: '/reports/stbd-ledger', icon: Receipt },
      { label: 'TBD Ledger',       href: '/reports/tbd-ledger',  icon: Receipt },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Day Book',         href: '/reports/daybook',            icon: BookOpen },
      { label: 'Daily Report',     href: '/reports/daily',              icon: Calendar },
      { label: 'General Ledger',   href: '/reports/ledger',             icon: FileText },
      { label: 'Dues List',        href: '/reports/dues',               icon: FileText },
      { label: 'Profit & Loss',    href: '/reports/profit-loss',        icon: TrendingUp },
      { label: 'Final Statement',  href: '/reports/statement',          icon: BarChart3 },
      { label: 'Business Details', href: '/reports/business',           icon: BarChart3 },
      { label: 'Partner Perf.',    href: '/reports/partner-performance',icon: Users },
      { label: 'New Customers',    href: '/reports/new-customers',      icon: UserPlus },
      { label: 'Phone Numbers',    href: '/reports/phone-numbers',      icon: FileText },
      { label: 'Edited / Deleted', href: '/reports/edited-deleted',     icon: FileText },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Ledger Settings',  href: '/settings/ledgers',           icon: SettingsIcon },
    ],
  },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [now, setNow] = useState<string>('')

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      )
    tick()
    const id = setInterval(tick, 30 * 1000)
    return () => clearInterval(id)
  }, [])

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 no-print">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-slate-800"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button
            className="hidden md:inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-slate-800"
            onClick={() => setCollapsed(v => !v)}
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-md bg-indigo-600 grid place-items-center font-bold text-xs">TF</div>
            <div className="leading-tight min-w-0">
              <div className="font-semibold text-sm truncate">TIRUMALA FINANCE</div>
              <div className="text-[10px] text-slate-400 -mt-0.5">Finance Management System</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-slate-300">
            <span className="hidden sm:inline tabular">{now || '—'}</span>
            <div className="h-8 w-8 rounded-full bg-slate-700 grid place-items-center text-xs font-semibold">A</div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar — desktop */}
        <aside
          className={cn(
            'hidden md:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto scrollbar-thin border-r border-slate-200 bg-white no-print transition-all',
            collapsed ? 'w-[68px]' : 'w-64'
          )}
        >
          <nav className="p-3 space-y-5">
            {GROUPS.map(group => (
              <div key={group.title}>
                {!collapsed && (
                  <div className="px-2 mb-1.5 text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                    {group.title}
                  </div>
                )}
                <ul className="space-y-0.5">
                  {group.items.map(({ label, href, icon: Icon }) => {
                    const active = isActive(href)
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          title={collapsed ? label : undefined}
                          className={cn(
                            'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                            active
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-slate-500 group-hover:text-slate-700')} />
                          {!collapsed && <span className="truncate">{label}</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Sidebar — mobile drawer */}
        {mobileOpen && (
          <>
            <div className="md:hidden fixed inset-0 bg-slate-900/50 z-40 no-print" onClick={() => setMobileOpen(false)} />
            <aside className="md:hidden fixed top-14 left-0 bottom-0 w-72 z-50 bg-white overflow-y-auto scrollbar-thin border-r border-slate-200 no-print">
              <nav className="p-3 space-y-5">
                {GROUPS.map(group => (
                  <div key={group.title}>
                    <div className="px-2 mb-1.5 text-[10px] font-semibold tracking-wider uppercase text-slate-400">{group.title}</div>
                    <ul className="space-y-0.5">
                      {group.items.map(({ label, href, icon: Icon }) => {
                        const active = isActive(href)
                        return (
                          <li key={href}>
                            <Link
                              href={href}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm',
                                active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{label}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </nav>
            </aside>
          </>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="no-print border-t border-slate-200 bg-white">
        <div className="px-6 py-3 text-xs text-slate-500 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Tirumala Finance · Gajwel, Dist: Siddipet, Telangana</span>
          <span>Production · v2.0</span>
        </div>
      </footer>
    </div>
  )
}
