import type { Metadata } from 'next'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { UserManagementPanel } from '@/components/admin/UserManagementPanel'
import { AdminShell } from '@/components/layout/AdminShell'

export const metadata: Metadata = {
  title: 'Admin users',
}

export default function AdminUsersPage() {
  return (
    <RequireAdmin>
      <AdminShell>
        <UserManagementPanel />
      </AdminShell>
    </RequireAdmin>
  )
}
