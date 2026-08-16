'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { authApi } from '@/lib/auth-api'
import { getErrorMessage } from '@/lib/api'
import { AppLogo } from '@/components/layout/AppLogo'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})

type FormValues = z.infer<typeof schema>

export const ForgotPasswordForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await authApi.forgotPassword(values.email)
      toast.success(response.message || 'Check your email for reset instructions')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not start password reset'))
    }
  })

  return (
    <div className="mx-auto w-full max-w-md">
      <AppLogo className="mb-10" />
      <h1 className="font-display text-4xl text-ink">Reset password</h1>
      <p className="mt-2 text-ink-soft">We will email a reset link if that account exists.</p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-md border border-line bg-white/80 px-3 py-2.5 text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-danger" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-teal px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-bright disabled:opacity-60"
        >
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        <Link href="/login" className="font-semibold text-teal hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
