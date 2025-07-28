'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { AuthService } from './auth-service'
import { supabase } from '@/lib/supabaseClient'
import type { AuthContextType, AuthState, SignInCredentials, SignUpCredentials, AuthUser } from '@/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: false,
    error: null,
  })

  useEffect(() => {
    // Initialize auth state
    const initializeAuth = async () => {
      setState(prev => ({ ...prev, loading: true }))
      try {
        const session = await AuthService.getCurrentSession()
        if (session?.user) {
          // Fetch user profile data from user_profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile fetch error:', profileError)
          }

          // Check if user is active
          if (profileData && !profileData.is_active) {
            // User is deactivated, sign them out
            await AuthService.signOut()
            setState({
              user: null,
              session: null,
              loading: false,
              error: 'Your account has been deactivated. Please reach out to the admin to reactivate your account.',
            })
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
        } else {
          setState({
            user: null,
            session: null,
            loading: false,
            error: null,
          })
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize auth',
        }))
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = AuthService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session)
        
        if (event === 'SIGNED_IN' && session) {
          // Fetch user profile data from user_profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile fetch error:', profileError)
          }

          // Check if user is active
          if (profileData && !profileData.is_active) {
            // User is deactivated, sign them out
            await AuthService.signOut()
            setState(prev => ({
              ...prev,
              user: null,
              session: null,
              loading: false,
              error: 'Your account has been deactivated. Please reach out to the admin to reactivate your account.',
            }))
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
          
          setState(prev => {
            // Only update if the state is actually different
            if (prev.user?.id !== user.id) {
              return {
                user,
                session: {
                  user,
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_at: session.expires_at || 0,
                },
                loading: false,
                error: null,
              }
            }
            return prev
          })
        } else if (event === 'SIGNED_OUT') {
          setState(prev => {
            // Only update if user was actually signed in
            if (prev.user !== null) {
              return {
                user: null,
                session: null,
                loading: false,
                error: null,
              }
            }
            return prev
          })
        } else if (event === 'TOKEN_REFRESHED') {
          // Ensure loading is false after token refresh
          setState(prev => ({ ...prev, loading: false }))
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (credentials: SignInCredentials) => {
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

  const signUp = async (credentials: SignUpCredentials) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      await AuthService.signUp(credentials)
      // For sign up, we want to reset loading state immediately since user needs to confirm email
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
      // Redirect to home page after sign out
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
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

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 