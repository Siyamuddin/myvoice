import type { Metadata } from 'next'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { SessionsPanel } from '@/components/auth/SessionsPanel'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'Sessions',
}

export default function SessionsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <SessionsPanel />
      </AppShell>
    </RequireAuth>
  )
}
