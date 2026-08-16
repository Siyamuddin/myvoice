import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center px-4 py-16 sm:px-6">
      <LoginForm />
    </div>
  )
}
