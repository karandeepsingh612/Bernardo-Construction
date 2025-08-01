'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If not loading and no user, redirect to sign in
    if (!loading && !user) {
      console.log('ProtectedRoute: No user found, redirecting to signin')
      const currentPath = window.location.pathname + window.location.search
      router.push(`/auth/signin?redirect=${encodeURIComponent(currentPath)}`)
    }
  }, [user, loading, router])

  // Show loading skeleton while auth is initializing
  if (loading) {
    return <LoadingSkeleton type="page" />
  }

  // If no user, show loading (will redirect in useEffect)
  if (!user) {
    return <LoadingSkeleton type="page" />
  }

  // User is authenticated, render the protected content
  return <>{children}</>
} 