"use client"

import { useState, useEffect } from "react"
import type { UserRole } from "@/types"
import { loadDashboardStats, getAvailableProjects, type DashboardStats, type DashboardFilters } from "@/lib/dashboardService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, X } from "lucide-react"
import { Plus, FileText, Users, Activity, Clock, CheckCircle, AlertCircle, Database, Building2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useLanguage } from "@/lib/language-context"

function DashboardContent() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [availableProjects, setAvailableProjects] = useState<string[]>([])
  const [filters, setFilters] = useState<DashboardFilters>({})

  // Get user role from authenticated user
  const userRole = user?.role as UserRole

  useEffect(() => {
    // Load available projects
    getAvailableProjects()
      .then(projects => {
        setAvailableProjects(projects)
      })
      .catch(error => {
        console.error('Failed to load projects:', error)
      })
  }, [])

  useEffect(() => {
    // Load optimized dashboard stats with filters
    setLoading(true)
    const filterParams: DashboardFilters = {}
    
    if (filters.projectId && filters.projectId !== 'all') {
      filterParams.projectId = filters.projectId
    }
    
    if (filters.status && filters.status !== 'all') {
      filterParams.status = filters.status
    }
    
    loadDashboardStats(filterParams, userRole)
      .then(data => {
        setDashboardStats(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Failed to load dashboard stats:', error)
        setLoading(false)
      })
  }, [filters, userRole])

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')} {t('dashboard.title').toLowerCase()}...</p>
        </div>
      </div>
    )
  }

  // Show empty state if no data
  if (!dashboardStats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Failed to load {t('dashboard.title').toLowerCase()} data</p>
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: "Active Requisitions",
      value: dashboardStats.activeRequisitions,
      description: "Currently in progress",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      title: "Pending Approvals",
      value: dashboardStats.pendingApprovals,
      description: "Awaiting your action",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
  ]

  // Use activity data from dashboard stats
  const recentActivities = dashboardStats.recentActivity.map(activity => ({
    ...activity,
    icon: activity.status === 'completed' ? CheckCircle : 
          activity.status === 'pending' ? AlertCircle : Activity
  }))

  // Use monthly data from dashboard stats
  const monthlyDataFull = dashboardStats.monthlyData

  // Pie chart data for requisition status
  const statusColors = [
    '#6366f1', // blue
    '#22c55e', // green
    '#f59e42', // orange
    '#ef4444', // red
    '#a855f7', // purple
    '#eab308', // yellow
    '#64748b', // gray
  ]
  const statusKeys = Object.keys(dashboardStats.statusBreakdown)
  const statusTotal = statusKeys.reduce((sum, k) => sum + dashboardStats.statusBreakdown[k], 0)
  
  console.log('Pie chart data:', { statusKeys, statusTotal, statusBreakdown: dashboardStats.statusBreakdown })
  
  const pieSlices = statusKeys.map((status, i) => {
    const value = dashboardStats.statusBreakdown[status]
    const percent = statusTotal > 0 ? value / statusTotal : 0
    
    // Create SVG path for pie slice
    const r = 40
    const centerX = 50
    const centerY = 50
    
    if (statusKeys.length === 1) {
      // Single item - create full circle
      const d = `M ${centerX} ${centerY - r} A ${r} ${r} 0 1 1 ${centerX} ${centerY + r} A ${r} ${r} 0 1 1 ${centerX} ${centerY - r} Z`
      return { d, color: statusColors[i % statusColors.length], status, value, percent }
    }
    
    // Multiple items - calculate angles
    const startAngle = statusKeys.slice(0, i).reduce((sum, k) => sum + (dashboardStats.statusBreakdown[k] / statusTotal) * 360, 0)
    const endAngle = startAngle + (percent * 360)
    
    // Convert angles to radians
    const startRad = (startAngle - 90) * Math.PI / 180
    const endRad = (endAngle - 90) * Math.PI / 180
    
    // Calculate start and end points
    const x1 = centerX + r * Math.cos(startRad)
    const y1 = centerY + r * Math.sin(startRad)
    const x2 = centerX + r * Math.cos(endRad)
    const y2 = centerY + r * Math.sin(endRad)
    
    // Determine if we need a large arc
    const largeArcFlag = percent > 0.5 ? 1 : 0
    
    // Create the SVG path
    const d = `M ${centerX} ${centerY} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
    
    return { d, color: statusColors[i % statusColors.length], status, value, percent }
  })

  return (
    <>
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl"></div>
        <div className="relative bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-3">
                {t('dashboard.title')}
              </h1>
              <p className="text-lg text-gray-600 max-w-3xl">
                {t('dashboard.subtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-6">
        <div className="flex items-center justify-end gap-4">
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('common.project')}:</span>
            <Select
              value={filters.projectId || 'all'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, projectId: value }))}
            >
              <SelectTrigger className="w-48 h-8 text-sm border-gray-200 bg-white/50">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allProjects')}</SelectItem>
                {availableProjects.map((project) => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stage Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('common.stage')}:</span>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-40 h-8 text-sm border-gray-200 bg-white/50">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allStages')}</SelectItem>
                <SelectItem value="resident">{t('dashboard.stages.resident')}</SelectItem>
                <SelectItem value="procurement">{t('dashboard.stages.procurement')}</SelectItem>
                <SelectItem value="treasury">{t('dashboard.stages.treasury')}</SelectItem>
                <SelectItem value="ceo">{t('dashboard.stages.ceo')}</SelectItem>
                <SelectItem value="payment">{t('dashboard.stages.payment')}</SelectItem>
                <SelectItem value="storekeeper">{t('dashboard.stages.storekeeper')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Clear Filters Button */}
          {(filters.projectId || filters.status) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({})
              }}
              className="h-8 px-2 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="h-3 w-3 mr-1" />
              {t('common.clear')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid - Financial Metrics First Row, Operational Metrics Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Total Submitted */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-orange-50 to-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">{t('dashboard.stats.totalSubmitted')}</CardTitle>
              <CardDescription className="text-gray-500">{t('dashboard.descriptions.totalSubmitted')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 mb-1">${dashboardStats.totalSubmitted.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </CardContent>
          </Card>
          {/* Total Approved */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">{t('dashboard.stats.totalApproved')}</CardTitle>
              <CardDescription className="text-gray-500">{t('dashboard.descriptions.totalApproved')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-700 mb-1">${dashboardStats.totalApproved.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </CardContent>
          </Card>
          {/* Total $ Spent */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-green-50 to-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">{t('dashboard.stats.totalSpent')}</CardTitle>
              <CardDescription className="text-gray-500">{t('dashboard.descriptions.totalSpent')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 mb-1">${dashboardStats.totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </CardContent>
          </Card>
          {/* Active Requisitions */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">{t('dashboard.stats.activeRequisitions')}</CardTitle>
              <CardDescription className="text-gray-500">{t('dashboard.descriptions.activeRequisitions')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 mb-1">{dashboardStats.activeRequisitions}</div>
            </CardContent>
          </Card>
          {/* Pending Approvals */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-amber-50 to-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">{t('dashboard.stats.pendingApprovals')}</CardTitle>
              <CardDescription className="text-gray-500">{t('dashboard.descriptions.pendingApprovals')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-700 mb-1">{dashboardStats.pendingApprovals}</div>
            </CardContent>
          </Card>
          {/* Requisitions in Past 7 Days */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">{t('dashboard.stats.recentRequisitions')}</CardTitle>
              <CardDescription className="text-gray-500">{t('dashboard.descriptions.recentRequisitions')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 mb-1">{dashboardStats.recentCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Grid - 3 visuals in 1 row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Projects & Requisitions per Project (Bar Chart) */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-indigo-50 to-white min-h-64">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">{t('dashboard.charts.projectsAndRequisitions')}</CardTitle>
              <CardDescription className="text-gray-500">{t('dashboard.charts.projectsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardStats.projectStats.length === 0 ? (
                <div className="text-gray-400 text-sm">{t('dashboard.charts.noProjectsFound')}</div>
              ) : (
                <div className="h-48 flex items-end gap-2 overflow-x-auto overflow-y-hidden pb-2">
                  {(() => {
                    // Calculate the maximum count to scale the bars properly
                    const maxCount = Math.max(...dashboardStats.projectStats.map(p => p.count))
                    const maxBarHeight = 120 // Maximum height in pixels
                    const scaleFactor = maxCount > 0 ? maxBarHeight / maxCount : 1
                    
                    return dashboardStats.projectStats.map((p) => (
                      <div key={p.projectName} className="flex flex-col items-center w-24 flex-shrink-0">
                        <div
                          className="w-full rounded-t bg-indigo-400"
                          style={{ 
                            height: `${Math.max(p.count * scaleFactor, 8)}px`, 
                            minHeight: '8px', 
                            maxHeight: `${maxBarHeight}px`,
                            opacity: p.count === 0 ? 0.3 : 1, 
                            transition: 'height 0.3s' 
                          }}
                          title={`${p.count} ${p.count !== 1 ? t('requisitions.title') : t('requisitions.title').slice(0, -1)}`}
                        ></div>
                        <div 
                          className="text-xs text-gray-500 mt-1 text-center break-words leading-tight min-h-12 flex items-center justify-center px-1"
                          title={p.projectName}
                        >
                          {p.projectName}
                        </div>
                        <div className="text-sm font-semibold text-gray-700">{p.count}</div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Requisitions per Month (Bar Chart) */}
          <Card className="border-2 shadow-lg min-h-64">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">{t('dashboard.charts.monthlyRequisitions')}</CardTitle>
              <CardDescription className="text-gray-500">{t('dashboard.charts.monthlyDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end gap-2 overflow-x-auto overflow-y-hidden pb-2">
                {(() => {
                  // Calculate the maximum count to scale the bars properly
                  const maxCount = Math.max(...monthlyDataFull.map(data => data.count))
                  const maxBarHeight = 120 // Maximum height in pixels
                  const scaleFactor = maxCount > 0 ? maxBarHeight / maxCount : 1
                  
                  return monthlyDataFull.map((data, i) => (
                    <div key={data.month} className="flex flex-col items-center w-16 flex-shrink-0">
                      <div
                        className="w-full rounded-t bg-purple-400"
                        style={{ 
                          height: `${Math.max(data.count * scaleFactor, 8)}px`, 
                          minHeight: '8px', 
                          maxHeight: `${maxBarHeight}px`,
                          transition: 'height 0.3s' 
                        }}
                      ></div>
                      <div className="text-xs text-gray-500 mt-1 text-center leading-tight">{data.month}</div>
                      <div className="text-sm font-semibold text-gray-700">{data.count}</div>
                    </div>
                  ))
                })()}
              </div>
            </CardContent>
          </Card>
          {/* Pie Chart for Requisition Status */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-pink-50 to-white flex flex-col justify-center min-h-64">
            <CardHeader className="text-left">
              <CardTitle className="text-sm font-semibold text-gray-700">{t('dashboard.charts.statusBreakdown')}</CardTitle>
              <CardDescription className="text-gray-500">{t('dashboard.charts.statusDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center w-full min-h-48">
                {statusTotal > 0 ? (
                  <>
                    <div className="flex items-center justify-center w-full mb-4">
                      <svg width="120" height="120" viewBox="0 0 100 100" className="flex-shrink-0">
                        {pieSlices.map((slice, i) => (
                          <path key={i} d={slice.d} fill={slice.color} stroke="#fff" strokeWidth="1" />
                        ))}
                        {/* Doughnut hole */}
                        <circle cx="50" cy="50" r="22" fill="#fff" />
                      </svg>
                    </div>
                    <div className="space-y-1 flex flex-col items-center max-h-32 overflow-y-auto">
                      {pieSlices.map((slice, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <span style={{ background: slice.color }} className="inline-block w-3 h-3 rounded-full flex-shrink-0"></span>
                          <span className="capitalize text-xs">{t(`requisitions.status.${slice.status}`)}</span>
                          <span className="text-gray-500 text-xs">({slice.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-2xl text-gray-400">📊</span>
                    </div>
                    <p className="text-sm">{t('dashboard.recentActivity.noStatusData')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Plus className="h-5 w-5 text-blue-600" />
              </div>
              {t('dashboard.quickActions.title')}
            </CardTitle>
            <CardDescription className="text-gray-600">{t('dashboard.quickActions.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/requisitions/new">
              <Button
                className="w-full justify-start h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                variant="default"
              >
                <Plus className="h-5 w-5 mr-3" />
                {t('dashboard.quickActions.createNewRequisition')}
              </Button>
            </Link>
            <Link href="/requisitions">
              <Button
                className="w-full justify-start h-12 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-blue-300 shadow-md hover:shadow-lg transition-all duration-200"
                variant="outline"
              >
                <FileText className="h-5 w-5 mr-3" />
                {t('dashboard.quickActions.viewAllRequisitions')}
              </Button>
            </Link>
            <Link href="/catalog">
              <Button
                className="w-full justify-start h-12 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-green-300 shadow-md hover:shadow-lg transition-all duration-200"
                variant="outline"
              >
                <Database className="h-5 w-5 mr-3" />
                {t('dashboard.quickActions.viewAllMaterials')}
              </Button>
            </Link>
                          <Link href="/catalog">
                <Button
                  className="w-full justify-start h-12 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-purple-300 shadow-md hover:shadow-lg transition-all duration-200"
                  variant="outline"
                >
                  <Building2 className="h-5 w-5 mr-3" />
                  {t('dashboard.quickActions.viewAllSuppliers')}
                </Button>
              </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-indigo-50/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Activity className="h-5 w-5 text-indigo-600" />
              </div>
              {t('dashboard.recentActivity.title')}
            </CardTitle>
            <CardDescription className="text-gray-600">{t('dashboard.recentActivity.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">{t('dashboard.recentActivity.noActivity')}</p>
                  <p className="text-xs">{t('dashboard.recentActivity.noActivityDescription')}</p>
                </div>
              ) : (
                recentActivities.map((activity) => (
                <Link 
                  key={activity.id} 
                  href={`/requisitions/${activity.requisitionId}`}
                  className="block"
                >
                  <div
                    className="flex items-start gap-4 p-3 rounded-lg bg-white/60 hover:bg-white/80 transition-all duration-200 cursor-pointer border border-gray-100 hover:border-blue-200 hover:shadow-sm"
                  >
                    <div
                      className={`p-2 rounded-full ${
                        activity.status === "completed"
                          ? "bg-emerald-100 text-emerald-600"
                          : activity.status === "pending"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <activity.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-5">{activity.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {t(`dashboard.stages.${activity.stage.toLowerCase()}`)}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  )
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}


