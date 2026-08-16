'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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

  return (
    <div className="min-h-screen">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-line bg-foam/95 backdrop-blur-md transition lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <AppLogo href="/admin/dashboard" />
          <button
            type="button"
            className="lg:hidden text-ink-soft"
            onClick={() => setOpen(false)}
            aria-label="Close admin menu"
          >
            ✕
          </button>
        </div>
        <nav className="space-y-1 p-4" aria-label="Admin">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-2.5 text-sm font-medium transition ${
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
            className="mt-4 block rounded-md px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-mist-deep/70"
            tabIndex={0}
          >
            Open Talk
          </Link>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-line p-4">
          <p className="truncate text-sm text-ink-soft">{user?.name || user?.email}</p>
          <button
            type="button"
            onClick={() => {
              void logout()
            }}
            className="mt-3 w-full rounded-md border border-line px-3 py-2 text-sm font-medium text-ink-soft hover:border-teal/40 hover:text-teal"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-foam/80 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="rounded-md border border-line px-3 py-1.5 text-sm lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open admin menu"
          >
            Menu
          </button>
          <p className="font-display text-xl text-ink">Admin</p>
          <span className="text-sm text-ink-soft">Free beta control plane</span>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  )
}
