'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { adminApi } from '@/lib/admin-api'
import { getErrorMessage } from '@/lib/api'
import type { PagedResponse, UserDto } from '@/types'

export const AdminDashboardPanel = () => {
  const [data, setData] = useState<PagedResponse<UserDto> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setData(await adminApi.getUsers(0, 8, 'id', 'desc'))
      } catch (error) {
        toast.error(getErrorMessage(error, 'Could not load dashboard'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-ink">Dashboard</h1>
        <p className="mt-2 text-ink-soft">Manage users and configure myvoice.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total users', value: data?.totalElements ?? '—' },
          { label: 'Loaded page', value: data?.content.length ?? '—' },
          { label: 'Pages', value: data?.totalPages ?? '—' },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel rounded-2xl p-5">
            <p className="text-sm text-ink-soft">{stat.label}</p>
            <p className="mt-2 font-display text-3xl text-ink">{loading ? '…' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/users" className="glass-panel rounded-2xl p-5 transition hover:border-teal/40">
          <h2 className="font-display text-2xl text-ink">Users</h2>
          <p className="mt-2 text-sm text-ink-soft">Search, edit, and remove accounts.</p>
        </Link>
        <Link href="/admin/settings" className="glass-panel rounded-2xl p-5 transition hover:border-teal/40">
          <h2 className="font-display text-2xl text-ink">Settings</h2>
          <p className="mt-2 text-sm text-ink-soft">Email, security, rate limits, storage, OAuth, voice.</p>
        </Link>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl text-ink">Recent users</h2>
          <Link href="/admin/users" className="text-sm font-semibold text-teal">
            View all
          </Link>
        </div>
        {loading ? (
          <p className="text-ink-soft">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 font-medium">Roles</th>
                </tr>
              </thead>
              <tbody>
                {(data?.content || []).map((user) => (
                  <tr key={user.id} className="border-b border-line/60">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/users/${user.id}`} className="font-medium text-teal">
                        {user.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-ink-soft">{user.email}</td>
                    <td className="py-3 text-ink-soft">
                      {user.roles?.map((role) => role.name.replace('ROLE_', '')).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
