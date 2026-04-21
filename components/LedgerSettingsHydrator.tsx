'use client'

/**
 * Client-only hydrator that fetches ledger overrides from the server once
 * on mount and pushes them into the in-memory store. Every ledger page
 * reads the merged rules through getEffectiveRule().
 */

import { useEffect } from 'react'
import { setAllOverrides, getAllOverrides } from '@/lib/finance'

export function LedgerSettingsHydrator() {
  useEffect(() => {
    let cancelled = false
    fetch('/api/settings/ledgers')
      .then(r => r.ok ? r.json() : {})
      .then(server => {
        if (cancelled || !server || typeof server !== 'object') return
        if (Object.keys(server).length === 0) return
        // Merge over any cached values so server is authoritative.
        const next = { ...getAllOverrides(), ...server }
        setAllOverrides(next)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  return null
}
