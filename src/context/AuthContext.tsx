import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, pass: string) => Promise<void>
  register: (name: string, email: string, pass: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const syncAuth = useCallback(() => {
    if (pb.authStore.isValid && pb.authStore.record) {
      setUser(pb.authStore.record as unknown as User)
      setToken(pb.authStore.token)
    } else {
      setUser(null)
      setToken(null)
    }
  }, [])

  useEffect(() => {
    syncAuth()
    setIsLoading(false)

    const unsubscribe = pb.authStore.onChange(() => {
      syncAuth()
    })

    return () => {
      unsubscribe()
    }
  }, [syncAuth])

  const login = async (email: string, pass: string) => {
    await pb.collection('users').authWithPassword(email, pass)
    syncAuth()
  }

  const register = async (name: string, email: string, pass: string) => {
    // Create user
    const newUser = await pb.collection('users').create({
      name,
      email,
      password: pass,
      passwordConfirm: pass,
      perfil: 'socio',
    })

    // Auth with the new user
    await pb.collection('users').authWithPassword(email, pass)
    syncAuth()

    // Initialize default configs for this new user
    try {
      await pb.collection('configuracoes').create({
        user: newUser.id,
        percentual_imobiliaria: 50,
        percentual_corretor: 40,
        percentual_captador: 10,
        percentual_comissao_padrao: 6,
      })
    } catch (e) {
      console.error('Error creating default configs:', e)
    }
  }

  const logout = () => {
    pb.authStore.clear()
    syncAuth()
  }

  const refreshUser = async () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      try {
        const record = await pb.collection('users').getOne(pb.authStore.record.id)
        setUser(record as unknown as User)
      } catch (err) {
        console.error('Failed to refresh user:', err)
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
