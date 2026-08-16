import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { SettingsPanel } from '@/components/admin/SettingsPanel'
import { AdminShell } from '@/components/layout/AdminShell'

export const metadata: Metadata = {
  title: 'Admin settings',
}

export default function AdminSettingsPage() {
  return (
    <RequireAdmin>
      <AdminShell>
        <Suspense fallback={<p className="text-ink-soft">Loading settings…</p>}>
          <SettingsPanel />
        </Suspense>
      </AdminShell>
    </RequireAdmin>
  )
}
