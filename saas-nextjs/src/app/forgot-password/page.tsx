import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Forgot password',
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center px-4 py-16 sm:px-6">
      <ForgotPasswordForm />
    </div>
  )
}
