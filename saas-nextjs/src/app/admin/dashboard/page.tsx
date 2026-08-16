import type { Metadata } from 'next'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { AdminDashboardPanel } from '@/components/admin/AdminDashboardPanel'
import { AdminShell } from '@/components/layout/AdminShell'

export const metadata: Metadata = {
  title: 'Admin dashboard',
}

export default function AdminDashboardPage() {
  return (
    <RequireAdmin>
      <AdminShell>
        <AdminDashboardPanel />
      </AdminShell>
    </RequireAdmin>
  )
}
