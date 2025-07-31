# 🔐 Complete Authentication & Route Protection Implementation Guide

## 📋 **Overview**
This guide provides a comprehensive blueprint for implementing authentication and route protection in a Next.js application using Supabase Auth. This implementation includes user registration, login, profile management, role-based access control, and component-level route protection.

---

## 🎯 **Phase 1: Authentication Foundation**

### **Step 1: Environment Setup**
```bash
# 1. Install Supabase dependencies
pnpm add @supabase/supabase-js @supabase/ssr

# 2. Create environment variables (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Step 2: Supabase Client Configuration**
```typescript
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### **Step 3: Database Schema Setup**
```sql
-- Create user_profiles table
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'resident'::user_role,
  can_manage_users boolean NULL DEFAULT false,
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_email_key UNIQUE (email)
);

-- Create user_role enum
CREATE TYPE public.user_role AS ENUM (
  'resident',
  'procurement', 
  'treasury',
  'ceo',
  'storekeeper'
);
```

---

## 🏗️ **Phase 2: Authentication Context & Types**

### **Step 4: Define Authentication Types**
```typescript
// types/auth.ts
export interface AuthUser {
  id: string
  email: string
  fullName?: string
  role?: 'resident' | 'procurement' | 'treasury' | 'ceo' | 'storekeeper'
  canManageUsers?: boolean
  isActive?: boolean
}

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  error: string | null
  signIn: (credentials: SignInCredentials) => Promise<void>
  signUp: (userData: SignUpData) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}
```

### **Step 5: Create Authentication Service**
```typescript
// lib/auth/auth-service.ts
import { supabase } from '@/lib/supabaseClient'

export const authService = {
  async signUp({ email, password, fullName }: SignUpData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/signin`
      }
    })
    
    if (error) throw error
    return data
  },

  async signIn({ email, password }: SignInCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }
}
```

### **Step 6: Create Authentication Context**
```typescript
// lib/auth/auth-context.tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { authService } from './auth-service'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize authentication state
  const initializeAuth = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await loadUserProfile(session.user.id)
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load user profile from database
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data && !data.is_active) {
        await signOut()
        setError('Your account has been deactivated. Please reach out to the admin to reactivate your account.')
        return
      }

      setUser({
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        role: data.role,
        canManageUsers: data.can_manage_users,
        isActive: data.is_active
      })
    } catch (error) {
      console.error('Profile loading error:', error)
    }
  }

  // Auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true)
        try {
          if (session?.user) {
            await loadUserProfile(session.user.id)
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error('Auth state change error:', error)
        } finally {
          setLoading(false)
        }
      }
    )

    initializeAuth()
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (credentials: SignInCredentials) => {
    setLoading(true)
    setError(null)
    try {
      await authService.signIn(credentials)
    } catch (error: any) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (userData: SignUpData) => {
    setLoading(true)
    setError(null)
    try {
      await authService.signUp(userData)
      setLoading(false) // Don't wait for email confirmation
    } catch (error: any) {
      setError(error.message)
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await authService.signOut()
      setUser(null)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

---

## 🎨 **Phase 3: Authentication UI Components**

### **Step 7: Create Authentication Layout**
```typescript
// components/auth/auth-layout.tsx
import React from 'react'
import Link from 'next/link'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-start justify-center pt-8 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center mb-4">
            <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
          </Link>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          {subtitle && (
            <p className="text-gray-600">{subtitle}</p>
          )}
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
```

### **Step 8: Create Sign-In Page**
```typescript
// app/auth/signin/page.tsx
'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AuthLayout } from '@/components/auth/auth-layout'
import { useAuth } from '@/lib/auth/auth-context'

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

function SignInForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { signIn, loading, error, clearError } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setSuccessMessage(decodeURIComponent(message))
    }
  }, [searchParams])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data: SignInForm) => {
    try {
      clearError()
      await signIn(data)
      
      // Check if there's a redirect URL
      const redirectUrl = searchParams.get('redirect')
      if (redirectUrl) {
        router.push(decodeURIComponent(redirectUrl))
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Sign in error:', error)
    }
  }

  return (
    <AuthLayout title="Sign In" subtitle="Welcome back">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {successMessage && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            {...register('email')}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              {...register('password')}
              className={errors.password ? 'border-red-500' : ''}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        <div className="text-center space-y-2">
          <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
            Forgot your password?
          </Link>
          <div className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}
```

### **Step 9: Create Sign-Up Page**
```typescript
// app/auth/signup/page.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AuthLayout } from '@/components/auth/auth-layout'
import { useAuth } from '@/lib/auth/auth-context'

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { signUp, loading, error, clearError } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  })

  const onSubmit = async (data: SignUpForm) => {
    try {
      clearError()
      await signUp(data)
      // After successful signup, redirect to signin with success message
      router.push('/auth/signin?message=Please check your email to confirm your account. If you don\'t see it, please check your spam or junk folder.')
    } catch (error) {
      console.error('Sign up error:', error)
    }
  }

  return (
    <AuthLayout title="Create Account" subtitle="Join us to get started">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            {...register('fullName')}
            className={errors.fullName ? 'border-red-500' : ''}
          />
          {errors.fullName && (
            <p className="text-sm text-red-500">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            {...register('email')}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              {...register('password')}
              className={errors.password ? 'border-red-500' : ''}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500">Password must be at least 8 characters long</p>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              {...register('confirmPassword')}
              className={errors.confirmPassword ? 'border-red-500' : ''}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
```

---

## 🛡️ **Phase 4: Route Protection System**

### **Step 10: Create Protected Route Component**
```typescript
// components/auth/protected-route.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If auth is not loading and user is not authenticated, redirect to sign-in
    if (!authLoading && !user) {
      // Save the current URL to redirect back after sign-in
      const currentPath = window.location.pathname + window.location.search
      if (currentPath !== '/auth/signin' && currentPath !== '/auth/signup') {
        router.push(`/auth/signin?redirect=${encodeURIComponent(currentPath)}`)
      }
    }
  }, [user, authLoading, router])

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-gray-500">Loading authentication...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show custom fallback or default message if not authenticated
  if (!user) {
    return fallback || (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-500">Please sign in to access this page</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User is authenticated, render the protected content
  return <>{children}</>
}
```

### **Step 11: Create Navigation Components**
```typescript
// components/auth/navigation-links.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/auth-context'
import { Home, FileText, Plus } from 'lucide-react'

export function NavigationLinks() {
  const { user } = useAuth()

  // Don't show navigation links if user is not authenticated
  if (!user) {
    return null
  }

  return (
    <>
      <Link
        href="/"
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
      >
        <Home className="h-4 w-4" />
        Dashboard
      </Link>
      <Link
        href="/catalog"
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
      >
        <FileText className="h-4 w-4" />
        Catalog
      </Link>
      <Link
        href="/requisitions"
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
      >
        <FileText className="h-4 w-4" />
        Requisitions
      </Link>
      <Link
        href="/requisitions/new"
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <Plus className="h-4 w-4" />
        New
      </Link>
    </>
  )
}
```

```typescript
// components/auth/auth-nav.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut } from 'lucide-react'
import { canManageUsers, getRoleDisplayName } from '@/lib/permissions'
import { ProfileModal } from './profile-modal'

export function AuthNav() {
  const { user, loading, signOut } = useAuth()
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user.fullName ? getInitials(user.fullName) : user.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.fullName || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              {user.role && (
                <p className="text-xs leading-none text-blue-600 font-medium">
                  {getRoleDisplayName(user.role)}
                  {canManageUsers(user) && (
                    <span className="ml-1 text-orange-600">• Admin</span>
                  )}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)} className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>

          {canManageUsers(user) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/users" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Manage Users</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => signOut()}
            className="flex items-center text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Modal */}
      <ProfileModal
        user={user}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  )
}
```

---

## 🔧 **Phase 5: Database Triggers & Policies**

### **Step 12: Create Database Triggers**
```sql
-- Create trigger function for new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    can_manage_users,
    is_active
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'resident'::public.user_role
    ),
    CASE 
      WHEN (NEW.raw_user_meta_data->>'role')::public.user_role IN ('procurement', 'treasury', 'ceo') 
      THEN true 
      ELSE false 
    END,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### **Step 13: Set Up Row Level Security (RLS)**
```sql
-- Enable RLS on user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Admin users can view all profiles
CREATE POLICY "Admin users can view all profiles" ON public.user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND can_manage_users = true
    )
  );

-- Policy: Admin users can update user profiles
CREATE POLICY "Admin users can update user profiles" ON public.user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND can_manage_users = true
    )
  );
```

---

## 🎯 **Phase 6: Application Integration**

### **Step 14: Update Root Layout**
```typescript
// app/layout.tsx
import { AuthProvider } from '@/lib/auth/auth-context'
import { AuthNav } from '@/components/auth/auth-nav'
import { NavigationLinks } from '@/components/auth/navigation-links'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-blue-100">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                  <Link href="/" className="flex items-center">
                    <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
                  </Link>

                  <div className="flex items-center gap-2">
                    <NavigationLinks />
                    <AuthNav />
                  </div>
                </div>
              </div>
            </nav>

            <main className="flex-1">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
```

### **Step 15: Protect Individual Pages**
```typescript
// app/page.tsx (Dashboard)
import { ProtectedRoute } from '@/components/auth/protected-route'

function DashboardContent() {
  // Your dashboard component logic
  return (
    <div>
      {/* Dashboard content */}
    </div>
  )
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
```

```typescript
// app/requisitions/page.tsx
import { ProtectedRoute } from '@/components/auth/protected-route'

function RequisitionsPageContent() {
  // Your requisitions page logic
  return (
    <div>
      {/* Requisitions content */}
    </div>
  )
}

export default function RequisitionsPage() {
  return (
    <ProtectedRoute>
      <RequisitionsPageContent />
    </ProtectedRoute>
  )
}
```

---

## 🔐 **Phase 7: Role-Based Permissions**

### **Step 16: Create Permissions System**
```typescript
// lib/permissions.ts
import { AuthUser } from '@/types/auth'

export const ROLE_PERMISSIONS = {
  resident: {
    canManageUsers: false,
    canViewAllProfiles: false,
    canManageCatalog: false,
  },
  procurement: {
    canManageUsers: true,
    canViewAllProfiles: true,
    canManageCatalog: true,
  },
  treasury: {
    canManageUsers: true,
    canViewAllProfiles: true,
    canManageCatalog: false,
  },
  ceo: {
    canManageUsers: true,
    canViewAllProfiles: true,
    canManageCatalog: true,
  },
  storekeeper: {
    canManageUsers: false,
    canViewAllProfiles: false,
    canManageCatalog: false,
  },
} as const

export function canManageUsers(user: AuthUser): boolean {
  return user.canManageUsers || false
}

export function canViewAllProfiles(user: AuthUser): boolean {
  return user.canManageUsers || false
}

export function canManageCatalog(user: AuthUser): boolean {
  return ROLE_PERMISSIONS[user.role || 'resident'].canManageCatalog
}

export function isAdmin(user: AuthUser): boolean {
  return user.canManageUsers || false
}

export function getRoleDisplayName(role: string): string {
  const displayNames: Record<string, string> = {
    resident: 'Resident',
    procurement: 'Procurement',
    treasury: 'Treasury',
    ceo: 'CEO',
    storekeeper: 'Storekeeper',
  }
  return displayNames[role] || 'Unknown'
}
```

---

## 🚀 **Phase 8: Testing & Deployment**

### **Step 17: Test Authentication Flow**
1. **Test User Registration**
   - Verify email confirmation flow
   - Check profile creation in database
   - Confirm role assignment

2. **Test User Login**
   - Verify authentication with valid credentials
   - Test redirect functionality
   - Check profile loading

3. **Test Route Protection**
   - Verify unauthenticated users are redirected
   - Test authenticated users can access protected routes
   - Check loading states

4. **Test Role-Based Access**
   - Verify different roles have appropriate permissions
   - Test admin functionality
   - Check UI elements based on user role

### **Step 18: Environment Variables for Production**
```bash
# .env.local (Development)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Production (Vercel/Netlify)
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
```

---

## 📋 **Key Implementation Points**

### **✅ Critical Success Factors:**
1. **Proper Environment Setup** - Ensure Supabase credentials are correctly configured
2. **Database Schema** - User profiles table with proper relationships
3. **RLS Policies** - Secure data access with appropriate permissions
4. **Error Handling** - Graceful handling of authentication errors
5. **Loading States** - Provide feedback during authentication operations
6. **Redirect Logic** - Preserve intended destination after login
7. **Role-Based UI** - Show/hide elements based on user permissions

### **🔧 Common Issues & Solutions:**
1. **Missing Environment Variables** - Always check `.env.local` file
2. **Database Trigger Issues** - Verify trigger function syntax and permissions
3. **RLS Policy Conflicts** - Test policies thoroughly with different user roles
4. **Client-Side Hydration** - Use `Suspense` boundaries for components with `useSearchParams`
5. **TypeScript Errors** - Ensure proper type definitions for auth context

### **🚀 Performance Optimizations:**
1. **Lazy Loading** - Load authentication components only when needed
2. **Caching** - Cache user profile data to reduce database calls
3. **Error Boundaries** - Implement error boundaries for authentication components
4. **Loading States** - Provide immediate feedback for better UX

---

## 📁 **File Structure Summary**

```
├── lib/
│   ├── supabaseClient.ts
│   ├── auth/
│   │   ├── auth-context.tsx
│   │   └── auth-service.ts
│   └── permissions.ts
├── types/
│   └── auth.ts
├── components/
│   └── auth/
│       ├── auth-layout.tsx
│       ├── auth-nav.tsx
│       ├── navigation-links.tsx
│       ├── protected-route.tsx
│       └── profile-modal.tsx
├── app/
│   ├── auth/
│   │   ├── signin/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── reset-password/
│   │       └── page.tsx
│   ├── layout.tsx
│   └── page.tsx (protected)
└── supabase/
    └── migrations/
        └── create_user_profiles.sql
```

---

## 🎯 **Quick Start Checklist**

- [ ] Set up Supabase project and get credentials
- [ ] Install dependencies (`@supabase/supabase-js`, `@supabase/ssr`)
- [ ] Create environment variables
- [ ] Set up database schema and triggers
- [ ] Configure RLS policies
- [ ] Create authentication context and service
- [ ] Build authentication UI components
- [ ] Implement route protection
- [ ] Add role-based permissions
- [ ] Test authentication flow
- [ ] Deploy with proper environment variables

This comprehensive guide provides a complete blueprint for implementing authentication and route protection in any Next.js application using Supabase Auth! 🎉 