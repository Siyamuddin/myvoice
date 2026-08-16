import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center px-4 py-12 pt-[max(3rem,var(--safe-top))] pb-[max(3rem,var(--safe-bottom))] sm:px-6 sm:py-16">
      <LoginForm />
    </div>
  )
}
