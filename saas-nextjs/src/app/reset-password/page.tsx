import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Reset password',
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center px-4 py-16 sm:px-6">
      <Suspense fallback={<p className="text-ink-soft">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
