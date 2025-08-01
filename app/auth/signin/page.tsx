'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'

import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth/auth-context'

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type SignInForm = z.infer<typeof signInSchema>

function SignInForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const { signIn, loading, error, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && !error && user) {
      console.log('SignInForm: User already authenticated, redirecting to dashboard')
      const redirectUrl = searchParams.get('redirect')
      if (redirectUrl) {
        router.push(decodeURIComponent(redirectUrl))
      } else {
        router.push('/')
      }
    }
  }, [loading, error, user, router, searchParams])

  // Handle success message from URL params
  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setSuccessMessage(decodeURIComponent(message))
    }
  }, [searchParams])

  // Clear errors on mount only
  useEffect(() => {
    // clearError() - removed since we simplified auth context
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data: SignInForm) => {
    try {
      // clearError() - removed since we simplified auth context
      await signIn(data)
      
      // Check if there's a redirect URL
      const redirectUrl = searchParams.get('redirect')
      if (redirectUrl) {
        router.push(decodeURIComponent(redirectUrl))
      } else {
        router.push('/')
      }
    } catch (error) {
      // Error is handled by the auth context
      console.error('Sign in error:', error)
    }
  }

  return (
    <AuthLayout
      title="Sign In"
              subtitle="Welcome back to Dinamiq"
    >
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
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        <div className="text-center space-y-2">
          <Link
            href="/auth/forgot-password"
            className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
          >
            Forgot your password?
          </Link>
          
          <div className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              href="/auth/signup"
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
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
    <Suspense fallback={
      <AuthLayout
        title="Sign In"
        subtitle="Loading..."
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AuthLayout>
    }>
      <SignInForm />
    </Suspense>
  )
} 