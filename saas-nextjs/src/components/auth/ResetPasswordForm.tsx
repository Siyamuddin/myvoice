'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { authApi } from '@/lib/auth-api'
import { getErrorMessage } from '@/lib/api'
import { AppLogo } from '@/components/layout/AppLogo'

const schema = z.object({
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[0-9]/, 'Include a number')
    .regex(/[^A-Za-z0-9]/, 'Include a special character'),
})

type FormValues = z.infer<typeof schema>

export const ResetPasswordForm = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = handleSubmit(async (values) => {
    if (!token) {
      toast.error('Reset token is missing')
      return
    }
    try {
      const response = await authApi.resetPassword(token, values.password)
      toast.success(response.message || 'Password updated')
      router.push('/login')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not reset password'))
    }
  })

  return (
    <div className="mx-auto w-full max-w-md">
      <AppLogo className="mb-8 sm:mb-10" />
      <h1 className="font-display text-3xl text-ink sm:text-4xl">Choose a new password</h1>
      <p className="mt-2 text-sm text-ink-soft sm:text-base">Use a strong password you have not used here before.</p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border border-line bg-white/80 px-3 py-2.5 text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-danger" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !token}
          className="min-h-12 w-full rounded-md bg-teal px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-bright disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : 'Update password'}
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
