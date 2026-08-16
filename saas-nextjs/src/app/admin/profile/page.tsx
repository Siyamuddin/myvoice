import type { Metadata } from 'next'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { ProfilePanel } from '@/components/auth/ProfilePanel'
import { AdminShell } from '@/components/layout/AdminShell'

export const metadata: Metadata = {
  title: 'Admin profile',
}

export default function AdminProfilePage() {
  return (
    <RequireAdmin>
      <AdminShell>
        <ProfilePanel />
      </AdminShell>
    </RequireAdmin>
  )
}
