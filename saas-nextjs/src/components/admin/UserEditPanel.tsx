'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { adminApi } from '@/lib/admin-api'
import { getErrorMessage } from '@/lib/api'
import type { UserDto } from '@/types'

type Props = {
  userId: number
}

export const UserEditPanel = ({ userId }: Props) => {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', about: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const user: UserDto = await adminApi.getUser(userId)
        setForm({
          name: user.name || '',
          email: user.email || '',
          about: user.about || '',
        })
      } catch (error) {
        toast.error(getErrorMessage(error, 'Could not load user'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [userId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi.updateUser(userId, form)
      toast.success('User updated')
      router.push(`/admin/users/${userId}`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update user'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-ink-soft">Loading…</p>
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-ink">Edit user</h1>
        <p className="mt-2 text-ink-soft">Update profile fields for this account.</p>
      </div>
      <div className="glass-panel space-y-4 rounded-2xl p-6">
        {(['name', 'email', 'about'] as const).map((field) => (
          <div key={field}>
            <label htmlFor={field} className="mb-1.5 block text-sm font-medium capitalize">
              {field}
            </label>
            {field === 'about' ? (
              <textarea
                id={field}
                rows={4}
                value={form[field]}
                onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                className="w-full rounded-md border border-line bg-white/80 px-3 py-2.5 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            ) : (
              <input
                id={field}
                value={form[field]}
                onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                className="w-full rounded-md border border-line bg-white/80 px-3 py-2.5 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            )}
          </div>
        ))}
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            void handleSave()
          }}
          className="rounded-md bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
      <Link href={`/admin/users/${userId}`} className="text-sm font-semibold text-teal">
        ← Cancel
      </Link>
    </div>
  )
}
