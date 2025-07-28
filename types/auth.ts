export interface AuthUser {
  id: string
  email: string
  fullName?: string
  role?: 'resident' | 'procurement' | 'treasury' | 'ceo' | 'storekeeper'
  canManageUsers?: boolean
  isActive?: boolean
  created_at?: string
  updated_at?: string
}

export interface AuthSession {
  user: AuthUser
  access_token: string
  refresh_token: string
  expires_at: number
}

export interface AuthState {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  error: string | null
}

export interface SignInCredentials {
  email: string
  password: string
}

export interface SignUpCredentials {
  email: string
  fullName: string
  password: string
  confirmPassword: string
}

export interface AuthContextType extends AuthState {
  signIn: (credentials: SignInCredentials) => Promise<void>
  signUp: (credentials: SignUpCredentials) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  clearError: () => void
} 