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
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw new Error(error.message)
    }

    return session
  }

  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
} 