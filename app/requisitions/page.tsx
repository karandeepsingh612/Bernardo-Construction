"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { loadRequisitions } from "@/lib/requisitionService"
import type { Requisition, UserRole } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Eye, ArrowUpDown, LayoutGrid, LayoutList, RefreshCw, Plus } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useLanguage } from "@/lib/language-context"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const PAGE_SIZE = 10

function RequisitionsPageContent() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, stageFilter, searchTerm])



  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0)
  }, [])

  // Load all requisitions - no user role filtering needed
  const loadRequisitionsData = useCallback(async () => {
    if (!user) {
      console.log('User not available, skipping requisitions load')
      return
    }

    console.log('Loading all requisitions for logged-in user')
    setLoading(true)
    setError(null) // Clear any previous errors
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setError(t('requisitions.loadError'))
      console.error('Requisitions load timeout after 10 seconds')
    }, 10000) // 10 second timeout
    
    try {
      const data = await loadRequisitions()
      clearTimeout(timeoutId)
      console.log('Requisitions loaded successfully:', data.length, 'items')
      const sortedData = sortRequisitionsByDate(data, sortOrder)
      setRequisitions(sortedData)
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Failed to load requisitions:', error)
      setRequisitions([]) // Set empty array on error
      setError(t('requisitions.loadError'))
    } finally {
      setLoading(false)
    }
  }, [user, sortOrder, t]) // Add t to dependencies



  // Effect to handle initial load and navigation
  useEffect(() => {
    if (user) {
      // Reset loading state and load data
      setLoading(false)
      setTimeout(() => {
        loadRequisitionsData()
      }, 0) // Use setTimeout to ensure state is reset first
    }
  }, [user]) // Only depend on user changes
  
  // Effect to handle sort order changes
  useEffect(() => {
    if (user && requisitions.length > 0) {
      // Only reload if we already have data (sort order change)
      loadRequisitionsData()
    }
  }, [sortOrder, loadRequisitionsData])

  const sortRequisitionsByDate = (data: Requisition[], order: 'asc' | 'desc') => {
    return [...data].sort((a, b) => {
      const dateA = new Date(a.createdDate).getTime()
      const dateB = new Date(b.createdDate).getTime()
      return order === 'asc' ? dateA - dateB : dateB - dateA
    })
  }

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const refreshRequisitions = async () => {
    if (!user || loading) return // Prevent refresh while already loading
    
    setLoading(true)
    setError(null) // Clear any previous errors
    
    // Add timeout for refresh as well
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setError(t('requisitions.loadError'))
      console.error('Requisitions refresh timeout after 10 seconds')
    }, 10000)
    
    try {
      const data = await loadRequisitions()
      clearTimeout(timeoutId)
      const sortedData = sortRequisitionsByDate(data, sortOrder)
      setRequisitions(sortedData)
      console.log('Requisitions refreshed:', data.length, 'items loaded')
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Failed to refresh requisitions:', error)
      setRequisitions([]) // Set empty array on error
      setError(t('requisitions.loadError'))
    } finally {
      setLoading(false)
    }
  }

  // Filter requisitions based on current filters
  const filteredRequisitions = requisitions.filter(requisition => {
    // Status filter
    if (statusFilter !== 'all' && requisition.status !== statusFilter) {
      return false
    }
    
    // Stage filter
    if (stageFilter !== 'all' && requisition.currentStage !== stageFilter) {
      return false
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        requisition.requisitionNumber.toLowerCase().includes(searchLower) ||
        requisition.projectName.toLowerCase().includes(searchLower) ||
        requisition.items.some(item => 
          item.description.toLowerCase().includes(searchLower) ||
          item.classification.toLowerCase().includes(searchLower)
        )
      )
    }
    
    return true
  })

  const totalPages = Math.ceil(filteredRequisitions.length / PAGE_SIZE)
  const paginatedRequisitions = filteredRequisitions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "approved":
        return "bg-blue-100 text-blue-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "resident":
        return "bg-blue-100 text-blue-800"
      case "procurement":
        return "bg-green-100 text-green-800"
      case "treasury":
        return "bg-purple-100 text-purple-800"
      case "ceo":
        return "bg-orange-100 text-orange-800"
      case "payment":
        return "bg-yellow-100 text-yellow-800"
      case "storekeeper":
        return "bg-pink-100 text-pink-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{t('requisitions.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('requisitions.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refreshRequisitions}
            disabled={loading}
            className="h-9 w-9"
            title="Refresh requisitions"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('card')}
            className={cn(
              viewMode === 'card' ? "bg-black hover:bg-black/90" : "bg-white hover:bg-gray-100",
              "h-9 w-9"
            )}
          >
            <LayoutGrid className={cn("h-4 w-4", viewMode === 'card' ? "text-white" : "text-gray-600")} />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
            className={cn(
              viewMode === 'table' ? "bg-black hover:bg-black/90" : "bg-white hover:bg-gray-100",
              "h-9 w-9"
            )}
          >
            <LayoutList className={cn("h-4 w-4", viewMode === 'table' ? "text-white" : "text-gray-600")} />
          </Button>
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          <Link href="/requisitions/new">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-sm bg-white hover:bg-gray-50 border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('requisitions.new')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm mb-4">
        <div className="p-4">
          <div className="flex items-center gap-4">
            <span className="font-medium">{t('common.filters')}</span>
            <Input
              placeholder={t('requisitions.filters.search')}
              className="max-w-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('requisitions.filters.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                            <SelectItem value="all">{t('requisitions.filters.allStatuses')}</SelectItem>
            <SelectItem value="DRAFT">{t('requisitions.status.draft')}</SelectItem>
            <SelectItem value="pending-resident">{t('requisitions.status.pending-resident')}</SelectItem>
            <SelectItem value="pending-procurement">{t('requisitions.status.pending-procurement')}</SelectItem>
            <SelectItem value="pending-treasury">{t('requisitions.status.pending-treasury')}</SelectItem>
            <SelectItem value="pending-ceo">{t('requisitions.status.pending-ceo')}</SelectItem>
            <SelectItem value="pending-payment">{t('requisitions.status.pending-payment')}</SelectItem>
            <SelectItem value="pending-storekeeper">{t('requisitions.status.pending-storekeeper')}</SelectItem>
            <SelectItem value="completed">{t('requisitions.status.completed')}</SelectItem>
            <SelectItem value="rejected">{t('requisitions.status.rejected')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('requisitions.filters.allStages')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('requisitions.filters.allStages')}</SelectItem>
                <SelectItem value="resident">{t('dashboard.stages.resident')}</SelectItem>
                <SelectItem value="procurement">{t('dashboard.stages.procurement')}</SelectItem>
                <SelectItem value="treasury">{t('dashboard.stages.treasury')}</SelectItem>
                <SelectItem value="ceo">{t('dashboard.stages.ceo')}</SelectItem>
                <SelectItem value="payment">{t('dashboard.stages.payment')}</SelectItem>
                <SelectItem value="storekeeper">{t('dashboard.stages.storekeeper')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSortOrder}
              className="ml-auto"
            >
              {t('requisitions.table.createdDate')}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">{t('requisitions.loading')}</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-600 text-center font-medium mb-2">{t('requisitions.loadError')}</p>
              <Button 
                onClick={refreshRequisitions}
                variant="outline"
                className="mt-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('requisitions.retry')}
              </Button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('requisitions.table.requisitionNumber')}</TableHead>
                  <TableHead>{t('requisitions.table.projectName')}</TableHead>
                  <TableHead>{t('requisitions.table.createdDate')}</TableHead>
                  <TableHead>{t('requisitions.table.items')}</TableHead>
                  <TableHead>{t('dashboard.stats.totalSubmitted')}</TableHead>
                  <TableHead>{t('dashboard.stats.totalApproved')}</TableHead>
                  <TableHead>{t('requisitions.table.status')}</TableHead>
                  <TableHead>{t('requisitions.table.currentStage')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequisitions.map((requisition) => (
                  <TableRow 
                    key={requisition.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => window.location.href = `/requisitions/${requisition.id}`}
                  >
                    <TableCell className="font-medium text-blue-600">
                      {requisition.requisitionNumber}
                    </TableCell>
                    <TableCell>{requisition.projectName}</TableCell>
                    <TableCell>
                      {(() => {
                        const [year, month, day] = requisition.createdDate.split('T')[0].split('-');
                        return `${month}/${day}/${year}`;
                      })()}
                    </TableCell>
                    <TableCell>{requisition.items.length}</TableCell>
                    <TableCell>
                      ${requisition.items.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ${requisition.items.reduce((sum, item) => sum + (item.approvalStatus === "approved" ? (item.total || 0) : 0), 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", getStatusColor(requisition.status))}>
                        {t(`requisitions.status.${requisition.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", getStageColor(requisition.currentStage))}>
                        {t(`dashboard.stages.${requisition.currentStage}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Add empty rows to maintain consistent height */}
                {Array.from({ length: Math.max(0, PAGE_SIZE - paginatedRequisitions.length) }).map((_, idx) => (
                  <TableRow key={`empty-${idx}`}>
                    {Array.from({ length: 8 }).map((_, cellIdx) => (
                      <TableCell key={`empty-${idx}-${cellIdx}`}>&nbsp;</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">{t('requisitions.loading')}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedRequisitions.map((requisition) => (
              <div 
                key={requisition.id} 
                className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:bg-gray-50 group"
                onClick={() => window.location.href = `/requisitions/${requisition.id}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-blue-600">
                      {requisition.requisitionNumber}
                    </h3>
                    <Badge className={cn("text-xs", getStatusColor(requisition.status))}>
                      {t(`requisitions.status.${requisition.status}`)}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", getStageColor(requisition.currentStage))}>
                      {t(`dashboard.stages.${requisition.currentStage}`)}
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click when clicking the button
                      window.location.href = `/requisitions/${requisition.id}`;
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {t('requisitions.table.view')}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-x-8 text-sm text-gray-600">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">{t('requisitions.table.projectName')}:</span> {requisition.projectName}
                    </div>
                    <div>
                      <span className="font-medium">{t('dashboard.stats.totalSubmitted')}:</span> $
                      {requisition.items.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">{t('requisitions.table.createdDate')}:</span>{" "}
                      {(() => {
                        const [year, month, day] = requisition.createdDate.split('T')[0].split('-');
                        return `${month}/${day}/${year}`;
                      })()}
                    </div>
                    <div>
                      <span className="font-medium">{t('dashboard.stats.totalApproved')}:</span> $
                      {requisition.items.reduce((sum, item) => sum + (item.approvalStatus === "approved" ? (item.total || 0) : 0), 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div>
                      <span className="font-medium">{t('requisitions.table.items')}:</span> {requisition.items.length}
                    </div>
                  </div>
                </div>

                {/* Material Status */}
                {requisition.items.some(item => item.approvalStatus) && (
                  <div className="mt-4 space-y-2">
                    {(() => {
                      const approvalGroups = requisition.items.reduce((acc, item) => {
                        if (!acc[item.approvalStatus]) {
                          acc[item.approvalStatus] = { count: 0, descriptions: [] };
                        }
                        acc[item.approvalStatus].count++;
                        acc[item.approvalStatus].descriptions.push(item.description);
                        return acc;
                      }, {} as Record<string, { count: number; descriptions: string[] }>);

                      return Object.entries(approvalGroups).map(([status, { count, descriptions }]) => (
                        <div key={status} className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              status === "approved" && "bg-green-50 text-green-700 border-green-200",
                              status === "rejected" && "bg-red-50 text-red-700 border-red-200",
                              status === "pending" && "bg-yellow-50 text-yellow-700 border-yellow-200",
                              status === "partial" && "bg-blue-50 text-blue-700 border-blue-200",
                              status === "Save for Later" && "bg-purple-50 text-purple-700 border-purple-200"
                            )}
                          >
                            {count} {status === "Save for Later" ? t('requisitionDetail.materialModal.status.saveForLater') : t(`requisitionDetail.materialModal.status.${status}`)}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {descriptions.join(", ")}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="mt-4 bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {t('common.showing')} {requisitions.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} {t('common.to')} {Math.min(page * PAGE_SIZE, requisitions.length)} {t('common.of')} {requisitions.length} {t('common.ofResults')}
          </div>
          <div className="flex-1 flex justify-center items-center">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>{t('common.previous')}</Button>
              <span className="text-sm">{t('common.page')} {page} {t('common.of')} {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)}>{t('common.next')}</Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{t('common.goToPage')}:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              defaultValue={page}
              className="w-14 px-2 py-1 border rounded text-sm"
            />
            <Button variant="outline" size="sm">{t('common.go')}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RequisitionsPage() {
  return (
    <ProtectedRoute>
      <RequisitionsPageContent />
    </ProtectedRoute>
  )
}
