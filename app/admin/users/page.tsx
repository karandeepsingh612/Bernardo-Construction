'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
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

export default function UserManagementPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
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
        title: "Role Updated",
        description: `User role has been successfully updated to ${getRoleDisplayName(editingRole as any)}.`,
      })
    } catch (error) {
      console.error('Error updating user role:', error)
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
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
        title: "Cannot Deactivate",
        description: "You cannot deactivate your own account.",
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
          title: "Error",
          description: "Failed to update user status. Please try again.",
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
        title: "User Status Updated",
        description: `User has been ${newStatus ? 'activated' : 'deactivated'} successfully.`,
      })
    } catch (error) {
      console.error('Error updating user status:', error)
      toast({
        title: "Error",
        description: "Failed to update user status. Please try again.",
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">Manage system users and their roles</p>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
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
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
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
                  <p className="text-sm font-medium text-gray-600">Admin Users</p>
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
                  <p className="text-sm font-medium text-gray-600">New This Week</p>
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
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-700"
              >
                <option value="all">All Roles</option>
                <option value="resident">Resident</option>
                <option value="procurement">Procurement</option>
                <option value="treasury">Treasury</option>
                <option value="ceo">CEO</option>
                <option value="storekeeper">Storekeeper</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              System Users ({filteredUsers.length})
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
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
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
                              <select
                                value={editingRole}
                                onChange={(e) => setEditingRole(e.target.value)}
                                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={updating}
                              >
                                <option value="resident">Resident</option>
                                <option value="procurement">Procurement</option>
                                <option value="treasury">Treasury</option>
                                <option value="ceo">CEO</option>
                                <option value="storekeeper">Storekeeper</option>
                              </select>
                            </div>
                          ) : (
                            <Badge 
                              variant="outline" 
                              className={`${getRoleColor(userProfile.role)}`}
                            >
                              {getRoleDisplayName(userProfile.role)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {userProfile.is_active ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm text-red-600 font-medium">Deactivated</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {userProfile.can_manage_users ? (
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-purple-600" />
                              <span className="text-sm text-purple-600">Admin</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">User</span>
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
                                      <p>Save role changes</p>
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
                                      <p>Cancel editing</p>
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
                                      <p>Change user role</p>
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
                                      <p>{userProfile.is_active ? 'Deactivate user' : 'Activate user'}</p>
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
                    <p className="text-gray-500">No users found matching your criteria.</p>
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
              Deactivate User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{userToDeactivate?.full_name}</strong>? 
              This user will no longer be able to sign in to the system until their account is reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDeactivate}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeactivate}
              className="bg-red-600 hover:bg-red-700"
            >
              Deactivate User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 