import { describe, expect, it } from 'vitest'
import { isAdmin } from '@/types'

describe('isAdmin', () => {
  it('returns true for ROLE_ADMIN', () => {
    expect(isAdmin({ roles: [{ id: 1, name: 'ROLE_ADMIN' }] })).toBe(true)
  })

  it('returns false for normal users', () => {
    expect(isAdmin({ roles: [{ id: 2, name: 'ROLE_NORMAL' }] })).toBe(false)
  })
})
