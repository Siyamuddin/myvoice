'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { adminApi } from '@/lib/admin-api'
import { getErrorMessage } from '@/lib/api'
import type { UserDto } from '@/types'

type Props = {
  userId: number
}

export const UserDetailPanel = ({ userId }: Props) => {
  const [user, setUser] = useState<UserDto | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setUser(await adminApi.getUser(userId))
      } catch (error) {
        toast.error(getErrorMessage(error, 'Could not load user'))
      }
    }
    void load()
  }, [userId])

  if (!user) {
    return <p className="text-ink-soft">Loading user…</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-ink sm:text-4xl">{user.name}</h1>
          <p className="mt-2 break-all text-sm text-ink-soft sm:text-base">{user.email}</p>
        </div>
        <Link
          href={`/admin/users/${user.id}/edit`}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white"
          tabIndex={0}
        >
          Edit
        </Link>
      </div>
      <div className="glass-panel space-y-3 rounded-2xl p-4 sm:p-6">
        <p>
          <span className="text-ink-soft">ID:</span> {user.id}
        </p>
        <p className="break-words">
          <span className="text-ink-soft">About:</span> {user.about || '—'}
        </p>
        <p className="break-words">
          <span className="text-ink-soft">Roles:</span>{' '}
          {user.roles?.map((role) => role.name).join(', ') || '—'}
        </p>
      </div>
      <Link href="/admin/users" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal" tabIndex={0}>
        ← Back to users
      </Link>
    </div>
  )
}
