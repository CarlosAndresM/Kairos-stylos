import { storage } from './storage'
import type { User } from '@/types'

// Hash simple para demo (NO usar en producción)
function simpleHash(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString()
}

export function hashPassword(password: string): string {
  return simpleHash(password).toString()
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword
}

export function login(email: string, password: string): User | null {
  const users = storage.getUsers()
  const user = users.find(u => u.email === email && u.activo)
  
  if (!user) return null
  
  if (verifyPassword(password, user.password)) {
    storage.setSession(user)
    return user
  }
  
  return null
}

export function logout(): void {
  storage.clearSession()
}

export function getCurrentUser(): User | null {
  return storage.getSession()
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}

