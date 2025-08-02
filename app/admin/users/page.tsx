'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useLanguage } from '@/lib/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Search, 
  Users, 
  Shield, 
  Mail, 
  Calendar,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X,
  Power,
  PowerOff,
  AlertTriangle
} from 'lucide-react'
import { canManageUsers, getRoleDisplayName } from '@/lib/permissions'
import { useToast } from '@/hooks/use-toast'
import { ProtectedRoute } from '@/components/auth/protected-route'

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: 'resident' | 'procurement' | 'treasury' | 'ceo' | 'storekeeper'
  can_manage_users: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

function UserManagementPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<string>('')
  const [updating, setUpdating] = useState(false)
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [userToDeactivate, setUserToDeactivate] = useState<UserProfile | null>(null)

  useEffect(() => {
    // Check if user has permission to access this page
    if (user && !canManageUsers(user)) {
      router.push('/')
      return
    }

    fetchUsers()
  }, [user, router])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        return
      }

      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || user.role === filterRole
    
    return matchesSearch && matchesRole
  })

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ceo':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'procurement':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'treasury':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'storekeeper':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'resident':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleEditRole = (userProfile: UserProfile) => {
    setEditingUserId(userProfile.id)
    setEditingRole(userProfile.role)
  }

  const handleCancelEdit = () => {
    setEditingUserId(null)
    setEditingRole('')
  }

  const handleSaveRole = async (userId: string) => {
    if (!editingRole) return

    try {
      setUpdating(true)
      
      // Determine if the new role should have admin privileges
      const canManageUsers = ['procurement', 'treasury', 'ceo'].includes(editingRole)
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          role: editingRole as any,
          can_manage_users: canManageUsers
        })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user role:', error)
        return
      }

      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: editingRole as any, can_manage_users: canManageUsers }
            : user
        )
      )

      setEditingUserId(null)
      setEditingRole('')
      
      toast({
        title: t('userManagement.messages.roleUpdated'),
        description: t('userManagement.messages.roleUpdateSuccess', { role: t(`userManagement.roles.${editingRole}`) }),
      })
    } catch (error) {
      console.error('Error updating user role:', error)
      toast({
        title: t('userManagement.messages.error'),
        description: t('userManagement.messages.updateRoleError'),
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleToggleUserStatus = async (userProfile: UserProfile) => {
    // Prevent deactivating yourself
    if (userProfile.id === user?.id) {
      toast({
        title: t('userManagement.messages.cannotDeactivateSelf'),
        description: t('userManagement.messages.cannotDeactivateSelfDescription'),
        variant: "destructive",
      })
      return
    }

    // If activating, proceed immediately
    if (!userProfile.is_active) {
      await performStatusUpdate(userProfile, true)
      return
    }

    // If deactivating, show confirmation dialog
    setUserToDeactivate(userProfile)
    setShowDeactivateConfirm(true)
  }

  const performStatusUpdate = async (userProfile: UserProfile, newStatus: boolean) => {
    try {
      setDeactivatingUserId(userProfile.id)
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: newStatus })
        .eq('id', userProfile.id)

      if (error) {
        console.error('Error updating user status:', error)
        toast({
          title: t('userManagement.messages.error'),
          description: t('userManagement.messages.updateStatusError'),
          variant: "destructive",
        })
        return
      }

      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userProfile.id 
            ? { ...u, is_active: newStatus }
            : u
        )
      )

      toast({
        title: t('userManagement.messages.userStatusUpdated'),
        description: newStatus ? t('userManagement.messages.userActivated') : t('userManagement.messages.userDeactivated'),
      })
    } catch (error) {
      console.error('Error updating user status:', error)
              toast({
          title: t('userManagement.messages.error'),
          description: t('userManagement.messages.updateStatusError'),
          variant: "destructive",
        })
    } finally {
      setDeactivatingUserId(null)
    }
  }

  const handleConfirmDeactivate = async () => {
    if (userToDeactivate) {
      await performStatusUpdate(userToDeactivate, false)
      setShowDeactivateConfirm(false)
      setUserToDeactivate(null)
    }
  }

  const handleCancelDeactivate = () => {
    setShowDeactivateConfirm(false)
    setUserToDeactivate(null)
  }

  if (!user || !canManageUsers(user)) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('userManagement.title')}</h1>
          <p className="text-gray-600">{t('userManagement.subtitle')}</p>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('userManagement.stats.totalUsers')}</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('userManagement.stats.activeUsers')}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {users.filter(u => u.is_active).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('userManagement.stats.adminUsers')}</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {users.filter(u => u.can_manage_users).length}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('userManagement.stats.newThisWeek')}</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {users.filter(u => {
                      const weekAgo = new Date()
                      weekAgo.setDate(weekAgo.getDate() - 7)
                      return new Date(u.created_at) > weekAgo
                    }).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('userManagement.search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select
                value={filterRole}
                onValueChange={(value) => setFilterRole(value)}
              >
                <SelectTrigger className="w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder={t('userManagement.search.allRoles')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('userManagement.search.allRoles')}</SelectItem>
                  <SelectItem value="resident">{t('userManagement.roles.resident')}</SelectItem>
                  <SelectItem value="procurement">{t('userManagement.roles.procurement')}</SelectItem>
                  <SelectItem value="treasury">{t('userManagement.roles.treasury')}</SelectItem>
                  <SelectItem value="ceo">{t('userManagement.roles.ceo')}</SelectItem>
                  <SelectItem value="storekeeper">{t('userManagement.roles.storekeeper')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('userManagement.table.systemUsers')} ({filteredUsers.length})
            </h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('userManagement.table.user')}</TableHead>
                      <TableHead>{t('userManagement.table.email')}</TableHead>
                      <TableHead>{t('userManagement.table.role')}</TableHead>
                      <TableHead>{t('userManagement.table.status')}</TableHead>
                      <TableHead>{t('userManagement.table.admin')}</TableHead>
                      <TableHead>{t('userManagement.table.joined')}</TableHead>
                      <TableHead>{t('userManagement.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userProfile) => (
                      <TableRow 
                        key={userProfile.id}
                        className={editingUserId === userProfile.id ? 'bg-blue-50 border-blue-200' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-sm">
                                {getInitials(userProfile.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">
                                {userProfile.full_name}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {userProfile.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingUserId === userProfile.id ? (
                            <div className="flex items-center gap-2">
                              <Select
                                value={editingRole}
                                onValueChange={(value) => setEditingRole(value)}
                                disabled={updating}
                              >
                                <SelectTrigger className="w-32 h-8 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="resident">{t('userManagement.roles.resident')}</SelectItem>
                                  <SelectItem value="procurement">{t('userManagement.roles.procurement')}</SelectItem>
                                  <SelectItem value="treasury">{t('userManagement.roles.treasury')}</SelectItem>
                                  <SelectItem value="ceo">{t('userManagement.roles.ceo')}</SelectItem>
                                  <SelectItem value="storekeeper">{t('userManagement.roles.storekeeper')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <Badge 
                              variant="outline" 
                              className={`${getRoleColor(userProfile.role)}`}
                            >
                              {t(`userManagement.roles.${userProfile.role}`)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {userProfile.is_active ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600">{t('userManagement.status.active')}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm text-red-600 font-medium">{t('userManagement.status.deactivated')}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {userProfile.can_manage_users ? (
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-purple-600" />
                              <span className="text-sm text-purple-600">{t('userManagement.table.admin')}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">{t('userManagement.table.user')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {new Date(userProfile.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <div className="flex items-center gap-2">
                              {editingUserId === userProfile.id ? (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        onClick={() => handleSaveRole(userProfile.id)}
                                        disabled={updating}
                                        className="h-8 px-2 bg-green-600 hover:bg-green-700"
                                      >
                                        {updating ? (
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                        ) : (
                                          <Save className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('userManagement.actions.saveRoleChanges')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        disabled={updating}
                                        className="h-8 px-2"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('userManagement.actions.cancelEditing')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </>
                              ) : (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditRole(userProfile)}
                                        className="h-8 px-2"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('userManagement.actions.changeRole')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant={userProfile.is_active ? "outline" : "default"}
                                        onClick={() => handleToggleUserStatus(userProfile)}
                                        disabled={deactivatingUserId === userProfile.id}
                                        className={`h-8 px-2 ${
                                          userProfile.is_active 
                                            ? 'text-red-600 border-red-600 hover:bg-red-50' 
                                            : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                      >
                                        {deactivatingUserId === userProfile.id ? (
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                        ) : userProfile.is_active ? (
                                          <PowerOff className="h-3 w-3" />
                                        ) : (
                                          <Power className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{userProfile.is_active ? t('userManagement.actions.deactivateUser') : t('userManagement.actions.activateUser')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredUsers.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">{t('userManagement.search.noUsersFound')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog open={showDeactivateConfirm} onOpenChange={setShowDeactivateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              {t('userManagement.dialogs.deactivateTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('userManagement.dialogs.deactivateDescription', { name: userToDeactivate?.full_name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDeactivate}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeactivate}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('userManagement.dialogs.deactivateConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function UserManagementPage() {
  return (
    <ProtectedRoute>
      <UserManagementPageContent />
    </ProtectedRoute>
  )
} 