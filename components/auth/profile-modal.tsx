'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Shield } from 'lucide-react'
import type { AuthUser } from '@/types/auth'
import { getRoleDisplayName } from '@/lib/permissions'
import { useLanguage } from '@/lib/language-context'

interface ProfileModalProps {
  user: AuthUser
  isOpen: boolean
  onClose: () => void
}

export function ProfileModal({ user, isOpen, onClose }: ProfileModalProps) {
  const { t } = useLanguage()
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('profile.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg font-semibold">
                {user.fullName ? getInitials(user.fullName) : user.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {user.fullName || t('profile.user')}
              </h3>
              {user.role && (
                <Badge variant="secondary" className="mt-1">
                  <Shield className="h-3 w-3 mr-1" />
                  {t(`dashboard.stages.${user.role}`)}
                </Badge>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">{t('profile.email')}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>

            {user.role && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{t('profile.role')}</p>
                  <p className="text-sm text-gray-600">{t(`dashboard.stages.${user.role}`)}</p>
                </div>
              </div>
            )}

            {user.created_at && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{t('profile.memberSince')}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 