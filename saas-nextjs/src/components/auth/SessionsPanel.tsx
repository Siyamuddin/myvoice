'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { userApi } from '@/lib/auth-api'
import { getErrorMessage } from '@/lib/api'
import type { UserSession } from '@/types'

export const SessionsPanel = () => {
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await userApi.sessions()
      setSessions(data)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load sessions'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleRevoke = async (sessionId: string) => {
    try {
      await userApi.revokeSession(sessionId)
      toast.success('Session revoked')
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not revoke session'))
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="font-display text-4xl text-ink">Sessions</h1>
      <p className="mt-2 text-ink-soft">Review and revoke active sign-ins.</p>

      <div className="mt-8 space-y-3">
        {loading && <p className="text-ink-soft">Loading…</p>}
        {!loading && sessions.length === 0 && (
          <p className="text-ink-soft">No active sessions found.</p>
        )}
        {sessions.map((session) => (
          <div
            key={session.sessionId}
            className="glass-panel flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-ink">{session.ipAddress || 'Unknown IP'}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {session.userAgent || 'Unknown device'} · signed in{' '}
                {new Date(session.loginTime).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void handleRevoke(session.sessionId)
              }}
              className="rounded-md border border-danger/30 px-3 py-2 text-sm font-medium text-danger"
              aria-label={`Revoke session ${session.sessionId}`}
            >
              Revoke
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
