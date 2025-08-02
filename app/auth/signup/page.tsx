'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth/auth-context'
import { useLanguage } from '@/lib/language-context'

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignUpForm = z.infer<typeof signUpSchema>

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { signUp, loading, error, clearError } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()



  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    mode: 'onSubmit',
  })

  const onSubmit = async (data: SignUpForm) => {
    try {
      clearError()
      await signUp(data)
      // After successful signup, redirect to signin or show success message
      router.push('/auth/signin?message=Please check your email to confirm your account. If you don\'t see it, please check your spam or junk folder.')
    } catch (error) {
      // Error is handled by the auth context
      console.error('Sign up error:', error)
    }
  }



  return (
    <AuthLayout
      title={t('auth.signUp.title')}
      subtitle={t('auth.signUp.subtitle')}
    >
      <form 
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName">{t('auth.signUp.fullName')}</Label>
          <Input
            id="fullName"
            type="text"
            placeholder={t('auth.signUp.fullNamePlaceholder')}
            {...register('fullName')}
            className={errors.fullName ? 'border-red-500' : ''}
          />
          {errors.fullName && (
            <p className="text-sm text-red-500">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.signUp.email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('auth.signUp.emailPlaceholder')}
            {...register('email')}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('auth.signUp.password')}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.signUp.passwordPlaceholder')}
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
          <p className="text-xs text-gray-500">
            {t('auth.signUp.passwordMinLength')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('auth.signUp.confirmPassword')}</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t('auth.signUp.confirmPasswordPlaceholder')}
              {...register('confirmPassword')}
              className={errors.confirmPassword ? 'border-red-500' : ''}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
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
              {t('auth.signUp.signingUp')}
            </>
          ) : (
            t('auth.signUp.signUpButton')
          )}
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            {t('auth.signUp.haveAccount')}{' '}
            <Link
              href="/auth/signin"
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              {t('auth.signUp.signIn')}
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
} 