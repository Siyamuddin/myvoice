import type { Metadata } from 'next'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { ProfilePanel } from '@/components/auth/ProfilePanel'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'Profile',
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <AppShell>
        <ProfilePanel />
      </AppShell>
    </RequireAuth>
  )
}
