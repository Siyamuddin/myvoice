'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'sonner'

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      {children}
      <Toaster richColors position="top-center" />
    </AuthProvider>
  )
}
