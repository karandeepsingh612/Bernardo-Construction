import React from 'react'

interface LoadingSkeletonProps {
  type?: 'page' | 'card' | 'table' | 'form'
  className?: string
}

export function LoadingSkeleton({ type = 'page', className = '' }: LoadingSkeletonProps) {
  if (type === 'page') {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 ${className}`}>
        <div className="container mx-auto py-6">
          <div className="animate-pulse">
            {/* Skeleton header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-20 h-10 bg-gray-200 rounded"></div>
                <div>
                  <div className="w-48 h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="w-32 h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-10 bg-gray-200 rounded"></div>
                <div className="w-20 h-10 bg-gray-200 rounded-full"></div>
              </div>
            </div>
            
            {/* Skeleton content */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="w-32 h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="w-full h-12 bg-gray-200 rounded"></div>
                  <div className="w-3/4 h-12 bg-gray-200 rounded"></div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="w-40 h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="w-full h-16 bg-gray-200 rounded"></div>
                  <div className="w-full h-16 bg-gray-200 rounded"></div>
                  <div className="w-full h-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'card') {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="w-32 h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="w-full h-4 bg-gray-200 rounded"></div>
            <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
            <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="animate-pulse">
          {/* Table header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="w-32 h-6 bg-gray-200 rounded"></div>
          </div>
          {/* Table rows */}
          <div className="divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="w-24 h-4 bg-gray-200 rounded"></div>
                  <div className="w-32 h-4 bg-gray-200 rounded"></div>
                  <div className="w-40 h-4 bg-gray-200 rounded"></div>
                  <div className="w-20 h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'form') {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="w-32 h-6 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            <div>
              <div className="w-20 h-4 bg-gray-200 rounded mb-2"></div>
              <div className="w-full h-10 bg-gray-200 rounded"></div>
            </div>
            <div>
              <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
              <div className="w-full h-10 bg-gray-200 rounded"></div>
            </div>
            <div>
              <div className="w-28 h-4 bg-gray-200 rounded mb-2"></div>
              <div className="w-full h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
} 