'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { AuthService } from './auth-service'
import { AuthUser, AuthState } from '@/types/auth'

interface AuthContextType extends AuthState {
  signIn: (credentials: { email: string; password: string }) => Promise<void>
  signUp: (credentials: { email: string; password: string; fullName: string; confirmPassword: string }) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  })

  const signIn = async (credentials: { email: string; password: string }) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      await AuthService.signIn(credentials)
      // Auth state change listener will handle the state update
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      }))
      throw error
    }
  }

  const signUp = async (credentials: { email: string; password: string; fullName: string; confirmPassword: string }) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      // Extract only the fields needed by the service
      const { email, password, fullName, confirmPassword } = credentials
      await AuthService.signUp({ email, password, fullName, confirmPassword })
      setState(prev => ({ ...prev, loading: false }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign up failed',
      }))
      throw error
    }
  }

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      await AuthService.signOut()
      // Auth state change listener will handle the state update
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
      }))
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      await AuthService.resetPassword(email)
      setState(prev => ({ ...prev, loading: false }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Password reset failed',
      }))
      throw error
    }
  }

  const updatePassword = async (password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      await AuthService.updatePassword(password)
      setState(prev => ({ ...prev, loading: false }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Password update failed',
      }))
      throw error
    }
  }

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }))
  }

  useEffect(() => {
    let isMounted = true
    
    const initializeAuth = async () => {
      console.log('Initializing auth state...')
      
      if (!isMounted) return
      
      try {
        // Get the current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          if (isMounted) {
            setState({
              user: null,
              session: null,
              loading: false,
              error: error.message,
            })
          }
          return
        }

        console.log('Current session:', session ? 'Found' : 'Not found')
        
        if (!isMounted) return
        
        if (session?.user) {
          console.log('User found in session:', session.user.id)
          
          // Fetch user profile data
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (!isMounted) return

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile fetch error:', profileError)
          }

          // Check if user is active
          if (profileData && !profileData.is_active) {
            console.log('User is deactivated, signing out...')
            await supabase.auth.signOut()
            if (isMounted) {
              setState({
                user: null,
                session: null,
                loading: false,
                error: 'Your account has been deactivated. Please reach out to the admin to reactivate your account.',
              })
            }
            return
          }

          const user = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: profileData?.full_name || session.user.user_metadata?.full_name || '',
            role: profileData?.role || 'resident',
            canManageUsers: profileData?.can_manage_users || false,
            isActive: profileData?.is_active ?? true,
            created_at: session.user.created_at,
            updated_at: session.user.updated_at,
          }

          console.log('Setting user state:', user)
          if (isMounted) {
            setState({
              user,
              session: {
                user,
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at || 0,
              },
              loading: false,
              error: null,
            })
          }
        } else {
          console.log('No session found, setting user to null')
          if (isMounted) {
            setState({
              user: null,
              session: null,
              loading: false,
              error: null,
            })
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (isMounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to initialize auth',
          }))
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session)
        
        if (!isMounted) return
        
        if (event === 'SIGNED_IN' && session) {
          console.log('User signed in, fetching profile...')
          
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (!isMounted) return

            if (profileError && profileError.code !== 'PGRST116') {
              console.error('Profile fetch error:', profileError)
            }

            if (profileData && !profileData.is_active) {
              console.log('User is deactivated, signing out...')
              await supabase.auth.signOut()
              if (isMounted) {
                setState(prev => ({
                  ...prev,
                  user: null,
                  session: null,
                  loading: false,
                  error: 'Your account has been deactivated. Please reach out to the admin to reactivate your account.',
                }))
              }
              return
            }

            const user: AuthUser = {
              id: session.user.id,
              email: session.user.email || '',
              fullName: profileData?.full_name || session.user.user_metadata?.full_name || '',
              role: profileData?.role || 'resident',
              canManageUsers: profileData?.can_manage_users || false,
              isActive: profileData?.is_active ?? true,
              created_at: session.user.created_at,
              updated_at: session.user.updated_at,
            }
            
            console.log('Setting user state after sign in:', user)
            if (isMounted) {
              setState({
                user,
                session: {
                  user,
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_at: session.expires_at || 0,
                },
                loading: false,
                error: null,
              })
            }
          } catch (error) {
            console.error('Error fetching profile after sign in:', error)
            if (isMounted) {
              setState(prev => ({
                ...prev,
                loading: false,
                error: 'Failed to load user profile',
              }))
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
          if (isMounted) {
            setState({
              user: null,
              session: null,
              loading: false,
              error: null,
            })
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 