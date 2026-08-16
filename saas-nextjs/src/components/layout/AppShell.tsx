'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppLogo } from './AppLogo'
import { isAdmin } from '@/types'

const NAV = [
  { href: '/voice', label: 'Talk' },
  { href: '/profile', label: 'Profile' },
  { href: '/sessions', label: 'Sessions' },
]

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const { user, logout, isLoading } = useAuth()
  const showAdmin = isAdmin(user)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const links = showAdmin
    ? [...NAV, { href: '/admin/dashboard', label: 'Admin' }]
    : NAV

  return (
    <div className="min-h-screen min-h-[100dvh]">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-foam/90 pt-[var(--safe-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <AppLogo href="/voice" className="text-2xl sm:text-3xl" />

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {links.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/voice' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-h-11 rounded-md px-3 py-2 text-sm font-medium transition ${
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

          <div className="flex items-center gap-2">
            <span className="hidden max-w-[10rem] truncate text-sm text-ink-soft lg:inline">
              {isLoading ? '…' : user?.name || user?.email}
            </span>
            <button
              type="button"
              onClick={() => {
                void logout()
              }}
              className="hidden min-h-11 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink-soft transition hover:border-teal/40 hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal md:inline-flex md:items-center"
              aria-label="Sign out"
            >
              Sign out
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-line text-ink md:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <span className="sr-only">Menu</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" aria-hidden="true">
                {menuOpen ? (
                  <path strokeWidth="2" strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path strokeWidth="2" strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-line bg-foam px-4 py-3 md:hidden safe-pb">
            <nav className="flex flex-col gap-1" aria-label="Mobile menu">
              {links.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`min-h-12 rounded-md px-3 py-3 text-base font-medium ${
                      active ? 'bg-teal/10 text-teal' : 'text-ink'
                    }`}
                    tabIndex={0}
                  >
                    {item.label}
                  </Link>
                )
              })}
              <button
                type="button"
                onClick={() => {
                  void logout()
                }}
                className="mt-1 min-h-12 rounded-md border border-line px-3 py-3 text-left text-base font-medium text-ink-soft"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 bottom-nav-pad sm:px-6 sm:py-10 md:pb-10">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-foam/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
        aria-label="Bottom navigation"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-3">
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 text-xs font-semibold ${
                  active ? 'text-teal' : 'text-ink-soft'
                }`}
                aria-current={active ? 'page' : undefined}
                tabIndex={0}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-teal' : 'bg-transparent'}`}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
