'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-auth'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider')
  }
  return context
}

interface SupabaseAuthProviderProps {
  children: React.ReactNode
}

export function SupabaseAuthProvider({ children }: SupabaseAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  
  const supabase = createClient()

  // Ensure we're on the client side to avoid hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        // Only log in development and for significant events
        if (process.env.NODE_ENV === 'development' && event !== 'INITIAL_SESSION') {
          console.log('Auth state changed:', event, session?.user?.email)
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Sign in error:', error)
    }

    setLoading(false)
    return { error }
  }

  const signOut = async () => {
    setLoading(true)
    
    try {
      // Perform logout with global scope to clear all sessions
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      
      if (error) {
        console.error('Sign out error:', error)
        // Don't throw error, continue with cleanup
      }
      
      // Clear local state immediately
      setSession(null)
      setUser(null)
      
      // Clear all possible storage locations
      if (typeof window !== 'undefined') {
        // Clear localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.') || key.includes('auth')) {
            localStorage.removeItem(key)
          }
        })
        
        // Clear sessionStorage
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('supabase.') || key.includes('auth')) {
            sessionStorage.removeItem(key)
          }
        })
        
        // Clear cookies manually
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=")
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
          if (name.includes('supabase') || name.includes('auth')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
          }
        })
      }
      
      // Force page reload to ensure complete cleanup
      window.location.replace('/login')
      
    } catch (error) {
      console.error('Sign out error:', error)
      // Even if there's an error, force logout
      setSession(null)
      setUser(null)
      window.location.replace('/login')
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading: loading || !isClient,
    signIn,
    signOut,
  }

  // Don't render until we're on the client to avoid hydration issues
  if (!isClient) {
    return null
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}