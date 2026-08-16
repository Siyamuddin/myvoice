'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { userApi } from '@/lib/auth-api'
import { getErrorMessage } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

const profileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  about: z.string().max(500).optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[0-9]/, 'Include a number')
    .regex(/[^A-Za-z0-9]/, 'Include a special character'),
})

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

export const ProfilePanel = () => {
  const { user, refreshUser } = useAuth()
  const [ready, setReady] = useState(false)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', about: '' },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    if (!user) return
    profileForm.reset({
      name: user.name || '',
      about: user.about || '',
    })
    setReady(true)
  }, [user, profileForm])

  const onSaveProfile = profileForm.handleSubmit(async (values) => {
    try {
      await userApi.updateMe(values)
      await refreshUser()
      toast.success('Profile updated')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update profile'))
    }
  })

  const onChangePassword = passwordForm.handleSubmit(async (values) => {
    try {
      await userApi.changePassword(values)
      passwordForm.reset()
      toast.success('Password changed')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not change password'))
    }
  })

  if (!ready) {
    return <p className="text-ink-soft">Loading profile…</p>
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
      <div>
        <h1 className="font-display text-4xl text-ink">Profile</h1>
        <p className="mt-2 text-ink-soft">{user?.email}</p>
      </div>

      <form onSubmit={onSaveProfile} className="glass-panel space-y-5 rounded-2xl p-6" noValidate>
        <h2 className="font-display text-2xl text-ink">Details</h2>
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            className="w-full rounded-md border border-line bg-white/80 px-3 py-2.5 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            {...profileForm.register('name')}
          />
          {profileForm.formState.errors.name && (
            <p className="mt-1 text-sm text-danger">{profileForm.formState.errors.name.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="about" className="mb-1.5 block text-sm font-medium">
            About
          </label>
          <textarea
            id="about"
            rows={4}
            className="w-full rounded-md border border-line bg-white/80 px-3 py-2.5 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            {...profileForm.register('about')}
          />
        </div>
        <button
          type="submit"
          disabled={profileForm.formState.isSubmitting}
          className="rounded-md bg-teal px-4 py-2.5 text-sm font-semibold text-white"
        >
          Save profile
        </button>
      </form>

      <form
        onSubmit={onChangePassword}
        className="glass-panel space-y-5 rounded-2xl p-6"
        noValidate
      >
        <h2 className="font-display text-2xl text-ink">Password</h2>
        <div>
          <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium">
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            className="w-full rounded-md border border-line bg-white/80 px-3 py-2.5 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            {...passwordForm.register('currentPassword')}
          />
        </div>
        <div>
          <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            className="w-full rounded-md border border-line bg-white/80 px-3 py-2.5 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            {...passwordForm.register('newPassword')}
          />
          {passwordForm.formState.errors.newPassword && (
            <p className="mt-1 text-sm text-danger">
              {passwordForm.formState.errors.newPassword.message}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={passwordForm.formState.isSubmitting}
          className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink"
        >
          Change password
        </button>
      </form>
    </div>
  )
}
