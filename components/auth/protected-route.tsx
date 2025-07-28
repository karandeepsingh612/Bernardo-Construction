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