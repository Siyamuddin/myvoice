'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/auth-api'
import { getErrorMessage } from '@/lib/api'
import { AppLogo } from '@/components/layout/AppLogo'

export const VerifyEmailPanel = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending')
  const [message, setMessage] = useState('Verifying your email…')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Verification token is missing.')
      return
    }

    const run = async () => {
      try {
        const response = await authApi.verifyEmail(token)
        setStatus('ok')
        setMessage(response.message || 'Email verified. You can sign in now.')
      } catch (error) {
        setStatus('error')
        setMessage(getErrorMessage(error, 'Verification failed'))
      }
    }

    void run()
  }, [token])

  return (
    <div className="mx-auto w-full max-w-md">
      <AppLogo className="mb-10" />
      <h1 className="font-display text-4xl text-ink">Email verification</h1>
      <p className={`mt-4 text-base ${status === 'error' ? 'text-danger' : 'text-ink-soft'}`}>
        {message}
      </p>
      <Link
        href="/login"
        className="mt-8 inline-flex rounded-md bg-teal px-4 py-3 text-sm font-semibold text-white"
      >
        Go to sign in
      </Link>
    </div>
  )
}
