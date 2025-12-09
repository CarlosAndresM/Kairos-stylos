"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout as authLogout } from '@/lib/auth'
import type { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    setLoading(false)
  }, [])

  const logout = () => {
    authLogout()
    setUser(null)
    router.push('/login')
  }

  const refreshUser = () => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
  }

  return {
    user,
    loading,
    logout,
    refreshUser,
    isAuthenticated: user !== null,
  }
}

