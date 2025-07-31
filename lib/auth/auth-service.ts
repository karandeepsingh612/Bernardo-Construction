import { supabase } from '@/lib/supabaseClient'
import type { SignInCredentials, SignUpCredentials, AuthUser } from '@/types/auth'

export class AuthService {
  static async signIn({ email, password }: SignInCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    // Check if user is active after successful authentication
    if (data.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_active')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        throw new Error('Failed to verify user status')
      }

      if (profileData && !profileData.is_active) {
        // Sign out the user if they're deactivated
        await supabase.auth.signOut()
        throw new Error('Your account has been deactivated. Please reach out to the admin to reactivate your account.')
      }
    }

    return data
  }

  static async signUp({ email, password, fullName }: SignUpCredentials) {
    console.log('Signing up user:', { email, fullName })
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/signin`
      }
    })

    if (error) {
      console.error('Signup error:', error)
      throw new Error(error.message)
    }

    console.log('Signup successful:', data)
    return data
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw new Error(error.message)
    }
  }

  static async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  static async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      throw new Error(error.message)
    }

    return user
  }

  static async getCurrentSession() {
    console.log('AuthService.getCurrentSession - Getting session...')
    
    try {
      // First try to get the session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('AuthService.getCurrentSession - Error:', error)
        throw new Error(error.message)
      }

      console.log('AuthService.getCurrentSession - Session:', session ? 'Found' : 'Not found')
      if (session) {
        console.log('AuthService.getCurrentSession - User ID:', session.user.id)
        
        // Check if session is expired and refresh if needed
        if (session.expires_at && session.expires_at * 1000 < Date.now()) {
          console.log('AuthService.getCurrentSession - Session expired, refreshing...')
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshError) {
            console.error('AuthService.getCurrentSession - Refresh error:', refreshError)
            throw new Error(refreshError.message)
          }
          
          console.log('AuthService.getCurrentSession - Session refreshed successfully')
          return refreshData.session
        }
      }
      
      return session
    } catch (error) {
      console.error('AuthService.getCurrentSession - Unexpected error:', error)
      throw error
    }
  }

  static async restoreSession() {
    console.log('AuthService.restoreSession - Attempting to restore session...')
    
    try {
      // Check if we have a stored session
      const hasStoredSession = this.checkSessionPersistence()
      console.log('AuthService.restoreSession - Has stored session:', hasStoredSession)
      
      if (!hasStoredSession) {
        console.log('AuthService.restoreSession - No stored session found')
        return null
      }
      
      // Try to get the current session
      const session = await this.getCurrentSession()
      console.log('AuthService.restoreSession - Session restored:', session ? 'Success' : 'Failed')
      
      return session
    } catch (error) {
      console.error('AuthService.restoreSession - Error restoring session:', error)
      return null
    }
  }

  static checkSessionPersistence() {
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem('dinamiq-auth')
      console.log('AuthService.checkSessionPersistence - Stored session:', storedSession ? 'Found' : 'Not found')
      return !!storedSession
    }
    return false
  }

  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
} 