'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppLogo } from '@/components/layout/AppLogo'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/profile', label: 'Profile' },
  { href: '/admin/sessions', label: 'Sessions' },
]

export const AdminShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="min-h-screen min-h-[100dvh]">
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          aria-label="Close admin menu overlay"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(18rem,88vw)] flex-col border-r border-line bg-foam/95 pt-[var(--safe-top)] backdrop-blur-md transition lg:w-64 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-4 sm:px-5">
          <AppLogo href="/admin/dashboard" className="text-2xl" />
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-line text-ink-soft lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close admin menu"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Admin">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block min-h-12 rounded-md px-3 py-3 text-sm font-medium transition ${
                  active ? 'bg-teal/10 text-teal' : 'text-ink-soft hover:bg-mist-deep/70 hover:text-ink'
                }`}
                aria-current={active ? 'page' : undefined}
                tabIndex={0}
              >
                {item.label}
              </Link>
            )
          })}
          <Link
            href="/voice"
            className="mt-4 block min-h-12 rounded-md px-3 py-3 text-sm font-medium text-ink-soft hover:bg-mist-deep/70"
            tabIndex={0}
          >
            Open Talk
          </Link>
        </nav>
        <div className="border-t border-line p-4 safe-pb">
          <p className="truncate text-sm text-ink-soft">{user?.name || user?.email}</p>
          <button
            type="button"
            onClick={() => {
              void logout()
            }}
            className="mt-3 min-h-12 w-full rounded-md border border-line px-3 py-3 text-sm font-medium text-ink-soft hover:border-teal/40 hover:text-teal"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-foam/90 px-4 pt-[var(--safe-top)] backdrop-blur-md sm:h-16 sm:px-6">
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm font-medium lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open admin menu"
          >
            Menu
          </button>
          <p className="font-display text-lg text-ink sm:text-xl">Admin</p>
          <span className="hidden text-sm text-ink-soft sm:inline">Control plane</span>
          <span className="w-11 lg:hidden" aria-hidden="true" />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 safe-pb sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  )
}
