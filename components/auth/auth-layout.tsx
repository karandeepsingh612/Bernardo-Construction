import React from 'react'
import Link from 'next/link'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center mb-4">
            <img src="/dinamiq-log.png" alt="Dinamiq Logo" className="h-12 w-auto" />
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