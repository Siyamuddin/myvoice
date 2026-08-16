import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = {
  title: 'Start free',
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center px-4 py-16 sm:px-6">
      <RegisterForm />
    </div>
  )
}
