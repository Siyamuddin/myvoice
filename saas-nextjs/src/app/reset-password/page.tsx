import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Reset password',
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center px-4 py-12 pt-[max(3rem,var(--safe-top))] pb-[max(3rem,var(--safe-bottom))] sm:px-6 sm:py-16">
      <Suspense fallback={<p className="text-ink-soft">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
