import type { Metadata } from 'next'
import { Suspense } from 'react'
import { VerifyEmailPanel } from '@/components/auth/VerifyEmailPanel'

export const metadata: Metadata = {
  title: 'Verify email',
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center px-4 py-16 sm:px-6">
      <Suspense fallback={<p className="text-ink-soft">Loading…</p>}>
        <VerifyEmailPanel />
      </Suspense>
    </div>
  )
}
