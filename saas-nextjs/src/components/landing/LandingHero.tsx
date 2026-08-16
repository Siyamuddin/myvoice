import Link from 'next/link'
import { AppLogo } from '@/components/layout/AppLogo'

export const LandingHero = () => {
  return (
    <section className="relative min-h-[100svh] overflow-hidden hero-grain text-white">
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-5xl flex-col px-4 pb-16 pt-8 sm:px-6">
        <header className="flex items-center justify-between animate-rise">
          <AppLogo tone="light" />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-sm font-medium text-white/85 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-bright"
              tabIndex={0}
              aria-label="Sign in"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-teal-bright px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              tabIndex={0}
              aria-label="Create free account"
            >
              Start free
            </Link>
          </div>
        </header>

        <div className="mt-auto max-w-2xl pb-8 pt-24 sm:pb-16">
          <h1 className="font-display animate-rise text-5xl leading-[1.05] tracking-tight sm:text-7xl">
            myvoice
          </h1>
          <p className="mt-5 max-w-xl animate-rise-delay text-lg text-white/85 sm:text-xl">
            A phone-call feel for AI conversation — native audio, barge-in, and sub-second
            responses in English, Bangla, and Korean.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 animate-rise-delay-2">
            <Link
              href="/register"
              className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-foam focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-bright"
              tabIndex={0}
              aria-label="Try myvoice free"
            >
              Try the free beta
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-white/35 px-5 py-3 text-sm font-medium text-white transition hover:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              tabIndex={0}
              aria-label="Sign in to existing account"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
