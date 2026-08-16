import type { Metadata } from 'next'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { UserEditPanel } from '@/components/admin/UserEditPanel'
import { AdminShell } from '@/components/layout/AdminShell'

export const metadata: Metadata = {
  title: 'Edit user',
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function AdminUserEditPage({ params }: Props) {
  const { id } = await params
  const userId = Number(id)

  return (
    <RequireAdmin>
      <AdminShell>
        <UserEditPanel userId={userId} />
      </AdminShell>
    </RequireAdmin>
  )
}
