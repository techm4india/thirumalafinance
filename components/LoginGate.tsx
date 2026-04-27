'use client'

import React, { FormEvent, useEffect, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { Button, Input } from '@/components/ui'

const AUTH_KEY = 'tirumala-finance-auth'

export function LoginGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setAuthed(window.localStorage.getItem(AUTH_KEY) === 'ok')
    setReady(true)
  }, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (username.trim().toLowerCase() === 'ramesh' && password === '1234') {
      window.localStorage.setItem(AUTH_KEY, 'ok')
      setAuthed(true)
      setError('')
      return
    }
    setError('Invalid username or password')
  }

  if (!ready) return null
  if (authed) return <>{children}</>

  return (
    <main className="min-h-screen bg-slate-100 grid place-items-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-slate-900 text-white grid place-items-center">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-slate-950">Tirumala Finance</h1>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Secure login</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Username</span>
            <Input value={username} onChange={e => setUsername(e.target.value)} autoFocus />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Password</span>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          {error && <div className="text-sm font-medium text-red-600">{error}</div>}
          <Button variant="primary" className="w-full justify-center" type="submit">Login</Button>
        </div>
      </form>
    </main>
  )
}

export function logoutFinanceUser() {
  window.localStorage.removeItem(AUTH_KEY)
  window.location.reload()
}
