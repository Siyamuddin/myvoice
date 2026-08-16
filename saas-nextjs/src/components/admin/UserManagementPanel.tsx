'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { adminApi } from '@/lib/admin-api'
import { getErrorMessage } from '@/lib/api'
import type { PagedResponse, UserDto } from '@/types'

export const UserManagementPanel = () => {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<PagedResponse<UserDto> | null>(null)
  const [searchResults, setSearchResults] = useState<UserDto[] | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSearchResults(null)
      setData(await adminApi.getUsers(page, 10, 'id', 'desc'))
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load users'))
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  const handleSearch = async () => {
    if (!query.trim()) {
      await load()
      return
    }
    setLoading(true)
    try {
      setSearchResults(await adminApi.searchUsers(query.trim()))
    } catch (error) {
      toast.error(getErrorMessage(error, 'Search failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (user: UserDto) => {
    if (!window.confirm(`Delete ${user.email}? This cannot be undone.`)) return
    try {
      await adminApi.deleteUser(user.id)
      toast.success('User deleted')
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete user'))
    }
  }

  const rows = searchResults ?? data?.content ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink sm:text-4xl">Users</h1>
        <p className="mt-2 text-sm text-ink-soft sm:text-base">Search and manage accounts.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleSearch()
          }}
          placeholder="Search by name"
          className="w-full rounded-md border border-line bg-white/80 px-3 py-2.5 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          aria-label="Search users"
        />
        <button
          type="button"
          onClick={() => {
            void handleSearch()
          }}
          className="min-h-11 shrink-0 rounded-md bg-teal px-4 py-2.5 text-sm font-semibold text-white"
        >
          Search
        </button>
      </div>

      <div className="glass-panel rounded-2xl p-3 sm:p-4">
        {loading ? (
          <p className="p-4 text-ink-soft">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-ink-soft">No users found.</p>
        ) : (
          <>
            <ul className="space-y-3 md:hidden" aria-label="Users">
              {rows.map((user) => (
                <li key={user.id} className="rounded-xl border border-line/70 bg-white/50 p-4">
                  <p className="font-medium text-ink">{user.name}</p>
                  <p className="mt-1 break-all text-sm text-ink-soft">{user.email}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {user.roles?.map((role) => role.name.replace('ROLE_', '')).join(', ') || '—'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm font-medium text-teal"
                      tabIndex={0}
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/users/${user.id}/edit`}
                      className="inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm font-medium text-teal"
                      tabIndex={0}
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void handleDelete(user)
                      }}
                      className="inline-flex min-h-11 items-center rounded-md border border-danger/30 px-3 text-sm font-medium text-danger"
                      aria-label={`Delete ${user.email}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line text-ink-soft">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Roles</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => (
                    <tr key={user.id} className="border-b border-line/60">
                      <td className="py-3 pr-4 font-medium text-ink">{user.name}</td>
                      <td className="py-3 pr-4 text-ink-soft">{user.email}</td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {user.roles?.map((role) => role.name.replace('ROLE_', '')).join(', ') || '—'}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/users/${user.id}`} className="text-teal hover:underline">
                            View
                          </Link>
                          <Link href={`/admin/users/${user.id}/edit`} className="text-teal hover:underline">
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDelete(user)
                            }}
                            className="text-danger hover:underline"
                            aria-label={`Delete ${user.email}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {!searchResults && data && data.totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            className="min-h-11 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-ink-soft">
            Page {page + 1} / {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages - 1}
            onClick={() => setPage((value) => value + 1)}
            className="min-h-11 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
