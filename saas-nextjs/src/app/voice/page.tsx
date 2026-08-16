import type { Metadata } from 'next'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import { VoiceStudio } from '@/components/voice/VoiceStudio'

export const metadata: Metadata = {
  title: 'Talk',
}

export default function VoicePage() {
  return (
    <RequireAuth>
      <AppShell>
        <VoiceStudio />
      </AppShell>
    </RequireAuth>
  )
}
