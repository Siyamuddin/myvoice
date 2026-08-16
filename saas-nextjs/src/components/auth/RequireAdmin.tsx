'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { isAdmin } from '@/types'

export const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (!isAdmin(user)) {
      router.replace('/voice')
    }
  }, [isAuthenticated, isLoading, router, user])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-soft">
        Loading…
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin(user)) {
    return null
  }

  return <>{children}</>
}
