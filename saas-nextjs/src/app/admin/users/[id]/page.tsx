import type { Metadata } from 'next'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { UserDetailPanel } from '@/components/admin/UserDetailPanel'
import { AdminShell } from '@/components/layout/AdminShell'

export const metadata: Metadata = {
  title: 'User detail',
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params
  const userId = Number(id)

  return (
    <RequireAdmin>
      <AdminShell>
        <UserDetailPanel userId={userId} />
      </AdminShell>
    </RequireAdmin>
  )
}
