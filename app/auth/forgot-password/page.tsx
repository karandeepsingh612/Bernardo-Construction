'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, ArrowLeft } from 'lucide-react'

import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth/auth-context'
import { useLanguage } from '@/lib/language-context'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { resetPassword, loading, error, clearError } = useAuth()
  const { t } = useLanguage()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      clearError()
      await resetPassword(data.email)
      setIsSubmitted(true)
    } catch (error) {
      // Error is handled by the auth context
      console.error('Password reset error:', error)
    }
  }

  if (isSubmitted) {
    return (
      <AuthLayout
        title={t('auth.forgotPassword.checkEmail')}
        subtitle={t('auth.forgotPassword.checkEmailSubtitle')}
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('auth.forgotPassword.resetLinkSent')}
            </h3>
            <p className="text-gray-600">
              {t('auth.forgotPassword.resetLinkSentMessage')}
            </p>
          </div>

          <div className="pt-4">
            <Link
              href="/auth/signin"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('auth.forgotPassword.backToSignIn')}
            </Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('auth.forgotPassword.title')}
      subtitle={t('auth.forgotPassword.subtitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.forgotPassword.email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('auth.forgotPassword.emailPlaceholder')}
            {...register('email')}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
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
              {t('auth.forgotPassword.sending')}
            </>
          ) : (
            t('auth.forgotPassword.sendButton')
          )}
        </Button>

        <div className="text-center">
          <Link
            href="/auth/signin"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('auth.forgotPassword.backToSignIn')}
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
} 