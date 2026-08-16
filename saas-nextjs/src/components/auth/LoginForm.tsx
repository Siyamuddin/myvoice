'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuth, getErrorMessage } from '@/contexts/AuthContext'
import { AppLogo } from '@/components/layout/AppLogo'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

export const LoginForm = () => {
  const { login } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values)
      toast.success('Welcome back')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not sign in'))
    }
  })

  return (
    <div className="mx-auto w-full max-w-md">
      <AppLogo className="mb-10" />
      <h1 className="font-display text-4xl text-ink">Sign in</h1>
      <p className="mt-2 text-ink-soft">Continue to your free-beta voice sessions.</p>

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

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
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

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-teal hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-teal px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-bright disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        New here?{' '}
        <Link href="/register" className="font-semibold text-teal hover:underline">
          Create a free account
        </Link>
      </p>
    </div>
  )
}
