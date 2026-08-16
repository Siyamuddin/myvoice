'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuth, getErrorMessage } from '@/contexts/AuthContext'
import { AppLogo } from '@/components/layout/AppLogo'

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[0-9]/, 'Include a number')
    .regex(/[^A-Za-z0-9]/, 'Include a special character'),
})

type FormValues = z.infer<typeof schema>

export const RegisterForm = () => {
  const { register: registerUser } = useAuth()
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const message = await registerUser(values)
      toast.success(message)
      router.push('/login')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not create account'))
    }
  })

  return (
    <div className="mx-auto w-full max-w-md">
      <AppLogo className="mb-10" />
      <h1 className="font-display text-4xl text-ink">Start free</h1>
      <p className="mt-2 text-ink-soft">
        Join the myvoice beta. Fair-use daily minutes keep the shared Gemini key sustainable.
      </p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className="w-full rounded-md border border-line bg-white/80 px-3 py-2.5 text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-danger" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

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
          disabled={isSubmitting}
          className="w-full rounded-md bg-teal px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-bright disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          {isSubmitting ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-teal hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
