"use client"

import { useState, useEffect } from "react"
import type { UserRole, Requisition } from "@/types"
import { loadRequisitions } from "@/lib/requisitionService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileText, Users, Activity, Clock, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"

function DashboardContent() {
  const { user } = useAuth()
  const [requisitions, setRequisitions] = useState<Requisition[]>([])

  // Get user role from authenticated user
  const userRole = user?.role as UserRole

  useEffect(() => {
    // Load requisitions
    loadRequisitions()
      .then(data => {
        setRequisitions(data)
      })
      .catch(error => {
        console.error('Failed to load requisitions:', error)
      })
  }, [])

  // Total $ spent
  const totalSpent = requisitions.reduce(
    (sum: number, req: Requisition) => sum + (req.items?.reduce((s: number, item: any) => s + (item.total || 0), 0) || 0),
    0
  )

  // Number of requisitions in the past 7 days
  const now = new Date()
  const recentCount = requisitions.filter((req: Requisition) => {
    const created = new Date(req.createdDate)
    return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) <= 7
  }).length

  // Requisitions per month (last 4 months)
  const monthlyCounts: Record<string, number> = {}
  requisitions.forEach((req: Requisition) => {
    const d = new Date(req.createdDate)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyCounts[ym] = (monthlyCounts[ym] || 0) + 1
  })
  // Only keep last 4 months
  const months = Object.keys(monthlyCounts).sort().slice(-4)
  const monthlyData = months.map(m => ({ month: m, count: monthlyCounts[m] }))

  // Projects and requisitions per project
  const projectMap: Record<string, number> = {}
  requisitions.forEach((req: Requisition) => {
    if (!projectMap[req.projectName]) projectMap[req.projectName] = 0
    projectMap[req.projectName]++
  })
  const projectStats = Object.entries(projectMap).map(([projectName, count]) => ({ projectName, count }))

  // Compute real stats for the top cards
  const activeCount = requisitions.filter(req => req.status !== 'completed' && req.status !== 'rejected').length
  const pendingCount = requisitions.filter(req => req.status.startsWith('pending')).length
  const nowMonth = new Date().getMonth()
  const nowYear = new Date().getFullYear()
  const completedThisMonth = requisitions.filter(req => req.status === 'completed' && new Date(req.createdDate).getMonth() === nowMonth && new Date(req.createdDate).getFullYear() === nowYear).length

  const stats = [
    {
      title: "Active Requisitions",
      value: activeCount,
      description: "Currently in progress",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      title: "Pending Approvals",
      value: pendingCount,
      description: "Awaiting your action",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
  ]

  const recentActivities = [
    {
      id: 1,
      title: "REQ-2024-01-001 moved to Procurement",
      time: "2 hours ago",
      status: "progress",
      icon: Activity,
    },
    {
      id: 2,
      title: "REQ-2024-01-002 completed",
      time: "1 day ago",
      status: "completed",
      icon: CheckCircle,
    },
    {
      id: 3,
      title: "REQ-2024-01-003 pending CEO approval",
      time: "2 days ago",
      status: "pending",
      icon: AlertCircle,
    },
  ]

  // Generate last 5 months labels
  const nowDate = new Date()
  const last5Months = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - 4 + i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const monthlyDataFull = last5Months.map(month => ({
    month,
    count: monthlyCounts[month] || 0
  }))

  // Pie chart data for requisition status
  const statusCounts: Record<string, number> = requisitions.reduce((acc: Record<string, number>, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1
    return acc
  }, {})
  const statusColors = [
    '#6366f1', // blue
    '#22c55e', // green
    '#f59e42', // orange
    '#ef4444', // red
    '#a855f7', // purple
    '#eab308', // yellow
    '#64748b', // gray
  ]
  const statusKeys = Object.keys(statusCounts)
  const statusTotal = statusKeys.reduce((sum, k) => sum + statusCounts[k], 0)
  let pieStart = 0
  const pieSlices = statusKeys.map((status, i) => {
    const value = statusCounts[status]
    const percent = value / statusTotal
    const startAngle = pieStart
    const endAngle = pieStart + percent * 360
    pieStart = endAngle
    // Convert to SVG arc
    const largeArc = percent > 0.5 ? 1 : 0
    const r = 40
    const x1 = 50 + r * Math.cos((startAngle - 90) * Math.PI / 180)
    const y1 = 50 + r * Math.sin((startAngle - 90) * Math.PI / 180)
    const x2 = 50 + r * Math.cos((endAngle - 90) * Math.PI / 180)
    const y2 = 50 + r * Math.sin((endAngle - 90) * Math.PI / 180)
    const d = `M50,50 L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`
    return { d, color: statusColors[i % statusColors.length], status, value }
  })

  return (
    <>
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl"></div>
        <div className="relative bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-3">
                Dinamiq Construction Dashboard
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl">
                Streamline your construction material requisitions with AI-powered insights and intelligent workflow
                management
              </p>
            </div>
          </div>
        </div>
      </div>

        {/* Stats Grid - Now 4 cards in 1 row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, index) => (
          <Card
            key={stat.title}
            className={`${stat.borderColor} ${stat.bgColor} border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
          >
              <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">{stat.title}</CardTitle>
                <CardDescription className="text-gray-500">{stat.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
              </CardContent>
            </Card>
          ))}
          {/* Total $ Spent */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-green-50 to-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">Total $ Spent</CardTitle>
              <CardDescription className="text-gray-500">Sum of all requisition totals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 mb-1">${totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </CardContent>
          </Card>
          {/* Requisitions in Past 7 Days */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">Requisitions (Past 7 Days)</CardTitle>
              <CardDescription className="text-gray-500">Created in the last week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 mb-1">{recentCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Grid - 3 visuals in 1 row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Projects & Requisitions per Project (Bar Chart) */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-indigo-50 to-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">Projects & Requisitions</CardTitle>
              <CardDescription className="text-gray-500">Number of requisitions per project</CardDescription>
            </CardHeader>
            <CardContent>
              {projectStats.length === 0 ? (
                <div className="text-gray-400 text-sm">No projects found</div>
              ) : (
                <div className="h-48 flex items-end gap-4">
                  {projectStats.map((p) => (
                    <div key={p.projectName} className="flex flex-col items-center w-14">
                      <div
                        className="w-full rounded-t bg-indigo-400"
                        style={{ height: `${p.count * 30}px`, minHeight: '8px', opacity: p.count === 0 ? 0.3 : 1, transition: 'height 0.3s' }}
                        title={`${p.count} requisition${p.count !== 1 ? 's' : ''}`}
                      ></div>
                      <div className="text-xs text-gray-500 mt-1">{p.projectName}</div>
                      <div className="text-sm font-semibold text-gray-700">{p.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Requisitions per Month (Bar Chart) */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700">Requisitions per Month</CardTitle>
              <CardDescription className="text-gray-500">Last 5 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end gap-4">
                {monthlyDataFull.map((data, i) => (
                  <div key={data.month} className="flex flex-col items-center w-14">
                    <div
                      className="w-full rounded-t bg-purple-400"
                      style={{ height: `${data.count * 30}px`, minHeight: '8px', transition: 'height 0.3s' }}
                    ></div>
                    <div className="text-xs text-gray-500 mt-1">{data.month}</div>
                    <div className="text-sm font-semibold text-gray-700">{data.count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {/* Pie Chart for Requisition Status */}
          <Card className="border-2 shadow-lg bg-gradient-to-br from-pink-50 to-white flex flex-col justify-center">
            <CardHeader className="text-left">
              <CardTitle className="text-sm font-semibold text-gray-700">Requisitions by Status</CardTitle>
              <CardDescription className="text-gray-500">Current status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center w-full">
                <div className="flex items-center justify-center w-full">
                  <svg width="120" height="120" viewBox="0 0 100 100">
                    {pieSlices.map((slice, i) => (
                      <path key={i} d={slice.d} fill={slice.color} stroke="#fff" strokeWidth="1" />
                    ))}
                    {/* Doughnut hole */}
                    <circle cx="50" cy="50" r="22" fill="#fff" />
                  </svg>
                </div>
                <div className="space-y-1 mt-4 flex flex-col items-center">
                  {pieSlices.map((slice, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span style={{ background: slice.color }} className="inline-block w-3 h-3 rounded-full"></span>
                      <span className="capitalize">{slice.status.replace(/[-_]/g, ' ')}</span>
                      <span className="text-gray-500">({slice.value})</span>
                    </div>
                  ))}
                </div>
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
              Quick Actions
            </CardTitle>
            <CardDescription className="text-gray-600">Common tasks for your role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/requisitions/new">
              <Button
                className="w-full justify-start h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                variant="default"
              >
                <Plus className="h-5 w-5 mr-3" />
                Create New Requisition
              </Button>
            </Link>
            <Link href="/requisitions">
              <Button
                className="w-full justify-start h-12 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-blue-300 shadow-md hover:shadow-lg transition-all duration-200"
                variant="outline"
              >
                <FileText className="h-5 w-5 mr-3" />
                View All Requisitions
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
              Recent Activity
            </CardTitle>
            <CardDescription className="text-gray-600">Latest updates on your requisitions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-3 rounded-lg bg-white/60 hover:bg-white/80 transition-colors duration-200"
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
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
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


