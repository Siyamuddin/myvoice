'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AppLogo } from './AppLogo'

const NAV = [
  { href: '/voice', label: 'Talk' },
  { href: '/profile', label: 'Profile' },
  { href: '/sessions', label: 'Sessions' },
]

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const { user, logout, isLoading } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-foam/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <AppLogo href="/voice" />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
            {NAV.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-teal/10 text-teal'
                      : 'text-ink-soft hover:bg-mist-deep/60 hover:text-ink'
                  }`}
                  aria-current={active ? 'page' : undefined}
                  tabIndex={0}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[10rem] truncate text-sm text-ink-soft sm:inline">
              {isLoading ? '…' : user?.name || user?.email}
            </span>
            <button
              type="button"
              onClick={() => {
                void logout()
              }}
              className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink-soft transition hover:border-teal/40 hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              aria-label="Sign out"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  )
}
