'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/auth-context'
import { useLanguage } from '@/lib/language-context'
import { Home, FileText, Plus } from 'lucide-react'

export function NavigationLinks() {
  const { user } = useAuth()
  const { t } = useLanguage()

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
        {t('navigation.dashboard')}
      </Link>
      <Link
        href="/catalog"
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
      >
        <FileText className="h-4 w-4" />
        {t('navigation.catalog')}
      </Link>
      <Link
        href="/requisitions"
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
      >
        <FileText className="h-4 w-4" />
        {t('navigation.requisitions')}
      </Link>
      <Link
        href="/requisitions/new"
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <Plus className="h-4 w-4" />
        {t('navigation.new')}
      </Link>
    </>
  )
} 