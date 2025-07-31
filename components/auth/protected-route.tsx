'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [redirectAttempted, setRedirectAttempted] = useState(false)

  useEffect(() => {
    console.log('ProtectedRoute - Auth state:', { user: user?.id, loading: authLoading, hasCheckedAuth })
    
    // Add a delay to ensure auth state is properly loaded
    const timer = setTimeout(() => {
      setHasCheckedAuth(true)
    }, 150) // Increased to 150ms to give more time

    return () => clearTimeout(timer)
  }, [user, authLoading])

  useEffect(() => {
    // Show loading immediately if auth is loading or we haven't checked auth yet
    if (authLoading || !hasCheckedAuth) {
      setShowLoading(true)
    } else {
      // Hide loading when auth is complete
      setShowLoading(false)
    }
  }, [authLoading, hasCheckedAuth])

  // Only redirect after we've given auth a chance to load and only once
  useEffect(() => {
    if (hasCheckedAuth && !authLoading && !user && !redirectAttempted) {
      console.log('ProtectedRoute - Redirecting to sign-in, no user found after auth check')
      setRedirectAttempted(true)
      
      // Save the current URL to redirect back after sign-in
      const currentPath = window.location.pathname + window.location.search
      if (currentPath !== '/auth/signin' && currentPath !== '/auth/signup') {
        console.log('ProtectedRoute - Redirecting to:', `/auth/signin?redirect=${encodeURIComponent(currentPath)}`)
        router.push(`/auth/signin?redirect=${encodeURIComponent(currentPath)}`)
      }
    } else if (hasCheckedAuth && !authLoading && user) {
      console.log('ProtectedRoute - User authenticated, allowing access')
      setRedirectAttempted(false) // Reset redirect flag when user is authenticated
    }
  }, [user, authLoading, hasCheckedAuth, router, redirectAttempted])

  // Show loading state if auth is loading or we haven't checked auth yet
  if (showLoading) {
    console.log('ProtectedRoute - Showing loading state')
    return <LoadingSkeleton type="page" />
  }

  // Show custom fallback or default message if not authenticated (only after we've checked auth)
  if (!user && hasCheckedAuth && !authLoading) {
    console.log('ProtectedRoute - No user, showing fallback')
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
  console.log('ProtectedRoute - Rendering protected content')
  return <>{children}</>
} 