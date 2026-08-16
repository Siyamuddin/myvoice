import Link from 'next/link'
import { AppLogo } from '@/components/layout/AppLogo'

export const LandingFooter = () => {
  return (
    <footer className="border-t border-line/70 bg-foam/50">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <AppLogo />
        <p className="text-sm text-ink-soft">Free beta · Fair-use daily voice minutes</p>
        <Link
          href="/register"
          className="text-sm font-semibold text-teal transition hover:text-teal-bright"
          tabIndex={0}
        >
          Create account
        </Link>
      </div>
    </footer>
  )
}
