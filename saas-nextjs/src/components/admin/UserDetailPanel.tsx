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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ink">{user.name}</h1>
          <p className="mt-2 text-ink-soft">{user.email}</p>
        </div>
        <Link
          href={`/admin/users/${user.id}/edit`}
          className="rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white"
        >
          Edit
        </Link>
      </div>
      <div className="glass-panel space-y-3 rounded-2xl p-6">
        <p>
          <span className="text-ink-soft">ID:</span> {user.id}
        </p>
        <p>
          <span className="text-ink-soft">About:</span> {user.about || '—'}
        </p>
        <p>
          <span className="text-ink-soft">Roles:</span>{' '}
          {user.roles?.map((role) => role.name).join(', ') || '—'}
        </p>
      </div>
      <Link href="/admin/users" className="text-sm font-semibold text-teal">
        ← Back to users
      </Link>
    </div>
  )
}
