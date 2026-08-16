import type { Metadata } from 'next'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { SessionsPanel } from '@/components/auth/SessionsPanel'
import { AdminShell } from '@/components/layout/AdminShell'

export const metadata: Metadata = {
  title: 'Admin sessions',
}

export default function AdminSessionsPage() {
  return (
    <RequireAdmin>
      <AdminShell>
        <SessionsPanel />
      </AdminShell>
    </RequireAdmin>
  )
}
