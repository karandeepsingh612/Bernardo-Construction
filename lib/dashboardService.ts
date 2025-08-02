import { supabase } from './supabaseClient';

export interface DashboardStats {
  totalRequisitions: number;
  activeRequisitions: number;
  pendingApprovals: number;
  totalSpent: number;
  totalSubmitted: number;
  totalApproved: number;
  recentCount: number;
  monthlyData: Array<{ month: string; count: number }>;
  projectStats: Array<{ projectName: string; count: number }>;
  statusBreakdown: Record<string, number>;
      recentActivity: Array<{
      id: string;
      title: string;
      time: string;
      status: string;
      requisitionId: string;
      stage: string;
    }>;
}

export interface DashboardFilters {
  projectId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: string; // This will now be used for stage filtering
}

export async function loadDashboardStats(filters?: DashboardFilters, userRole?: string): Promise<DashboardStats> {
  console.log('loadDashboardStats: Loading optimized dashboard data')
  
  try {
    // Build query with filters
    let query = supabase
      .from('requisitions')
      .select(`
        id,
        requisition_number,
        status,
        current_stage,
        project_name,
        created_date,
        last_modified
      `)

    // Apply filters
    if (filters?.projectId && filters.projectId !== 'all') {
      query = query.eq('project_name', filters.projectId)
    }
    
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('current_stage', filters.status.toLowerCase())
    }
    
    if (filters?.dateRange) {
      query = query
        .gte('created_date', filters.dateRange.start.toISOString())
        .lte('created_date', filters.dateRange.end.toISOString())
    }

    const { data: requisitions, error } = await query.order('last_modified', { ascending: false })

    if (error) {
      console.error('loadDashboardStats: Error loading requisitions:', error)
      throw error
    }

    if (!requisitions || requisitions.length === 0) {
      return {
        totalRequisitions: 0,
        activeRequisitions: 0,
        pendingApprovals: 0,
        totalSpent: 0,
        totalSubmitted: 0,
        totalApproved: 0,
        recentCount: 0,
        monthlyData: [],
        projectStats: [],
        statusBreakdown: {},
        recentActivity: []
      }
    }

    console.log('loadDashboardStats: Loaded', requisitions.length, 'requisitions')

    // Calculate dashboard metrics
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // Get detailed financial data from requisition items
    const { data: requisitionItems, error: itemsError } = await supabase
      .from('requisition_items')
      .select(`
        requisition_id, 
        total, 
        approval_status,
        payment_status,
        payment_amount
      `)
    
    if (itemsError) {
      console.error('loadDashboardStats: Error loading requisition items:', itemsError)
      throw itemsError
    }

    // Filter requisition items to only include those from filtered requisitions
    const filteredRequisitionIds = requisitions.map(req => req.id)
    const filteredItems = requisitionItems?.filter(item => 
      filteredRequisitionIds.includes(item.requisition_id)
    ) || []

    console.log('loadDashboardStats: Filtered to', filteredItems.length, 'requisition items from', requisitionItems?.length || 0, 'total items')

    // Calculate financial metrics
    let totalSpent = 0
    let totalSubmitted = 0
    let totalApproved = 0

    filteredItems.forEach(item => {
      const itemTotal = item.total || 0
      
      // Total Submitted: Sum of all item totals
      totalSubmitted += itemTotal
      
      // Total Approved: Sum of items with approved status
      if (item.approval_status === 'approved') {
        totalApproved += itemTotal
      }
      
      // Total Spent: Sum of items with completed payments
      if (item.payment_status === 'completed') {
        totalSpent += itemTotal
      }
    })

    const totalRequisitions = requisitions.length
    const activeRequisitions = requisitions.filter(req => 
      req.status !== 'APPROVED' && req.status !== 'REJECTED'
    ).length
    
    // Role-based pending approvals
    let pendingApprovals = 0
    if (userRole) {
      switch (userRole) {
        case 'resident':
          pendingApprovals = requisitions.filter(req => 
            req.current_stage === 'resident' && req.status !== 'APPROVED' && req.status !== 'REJECTED'
          ).length
          break
        case 'procurement':
          pendingApprovals = requisitions.filter(req => 
            req.current_stage === 'procurement' && req.status !== 'APPROVED' && req.status !== 'REJECTED'
          ).length
          break
        case 'treasury':
          pendingApprovals = requisitions.filter(req => 
            req.current_stage === 'treasury' && req.status !== 'APPROVED' && req.status !== 'REJECTED'
          ).length
          break
        case 'ceo':
          pendingApprovals = requisitions.filter(req => 
            req.current_stage === 'ceo' && req.status !== 'APPROVED' && req.status !== 'REJECTED'
          ).length
          break
        case 'storekeeper':
          pendingApprovals = requisitions.filter(req => 
            req.current_stage === 'storekeeper' && req.status !== 'APPROVED' && req.status !== 'REJECTED'
          ).length
          break
        default:
          // For other roles or no role, show all pending
          pendingApprovals = requisitions.filter(req => 
            req.status === 'PENDING'
          ).length
      }
    } else {
      // Fallback to original logic if no user role
      pendingApprovals = requisitions.filter(req => 
        req.status === 'PENDING'
      ).length
    }
    
    const recentCount = requisitions.filter(req => 
      new Date(req.created_date) >= sevenDaysAgo
    ).length

    // Monthly breakdown (last 5 months)
    const monthlyCounts: Record<string, number> = {}
    const last5Months = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
    
    requisitions.forEach(req => {
      const d = new Date(req.created_date)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyCounts[ym] = (monthlyCounts[ym] || 0) + 1
    })
    
    const monthlyData = last5Months.map(month => ({
      month,
      count: monthlyCounts[month] || 0
    }))

    // Project breakdown
    const projectMap: Record<string, number> = {}
    requisitions.forEach(req => {
      projectMap[req.project_name] = (projectMap[req.project_name] || 0) + 1
    })
    const projectStats = Object.entries(projectMap).map(([projectName, count]) => ({
      projectName,
      count
    }))

    // Status breakdown
    const statusBreakdown: Record<string, number> = {}
    requisitions.forEach(req => {
      statusBreakdown[req.status] = (statusBreakdown[req.status] || 0) + 1
    })

    // Recent activity (top 3 most recent)
    const recentActivity = requisitions.slice(0, 3).map(req => {
      const lastModified = new Date(req.last_modified || req.created_date)
      const timeDiff = now.getTime() - lastModified.getTime()
      
      let timeAgo = ''
      if (timeDiff < 60 * 60 * 1000) {
        const minutes = Math.floor(timeDiff / (60 * 1000))
        timeAgo = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
      } else if (timeDiff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(timeDiff / (60 * 60 * 1000))
        timeAgo = `${hours} hour${hours !== 1 ? 's' : ''} ago`
      } else if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(timeDiff / (24 * 60 * 60 * 1000))
        timeAgo = `${days} day${days !== 1 ? 's' : ''} ago`
      } else {
        const weeks = Math.floor(timeDiff / (7 * 24 * 60 * 60 * 1000))
        timeAgo = `${weeks} week${weeks !== 1 ? 's' : ''} ago`
      }

      let title = ''
      let status = 'progress'
      let stage = req.current_stage || 'UNKNOWN'
      
      // Format stage name for better display
      const formatStageName = (stageName: string) => {
        switch (stageName.toLowerCase()) {
          case 'resident': return 'Resident'
          case 'procurement': return 'Procurement'
          case 'treasury': return 'Treasury'
          case 'ceo': return 'CEO'
          case 'payment': return 'Payment'
          case 'storekeeper': return 'Storekeeper'
          default: return stageName.charAt(0).toUpperCase() + stageName.slice(1).toLowerCase()
        }
      }
      
      if (req.status === 'APPROVED') {
        title = `${req.requisition_number} completed`
        status = 'completed'
      } else if (req.status === 'REJECTED') {
        title = `${req.requisition_number} rejected`
        status = 'pending'
      } else if (req.status === 'PENDING') {
        title = `${req.requisition_number} pending approval`
        status = 'pending'
      } else if (req.status === 'DRAFT') {
        title = `${req.requisition_number} created as draft`
        status = 'progress'
      } else {
        title = `${req.requisition_number} Updated`
        status = 'progress'
      }

      return {
        id: req.id,
        title,
        time: timeAgo,
        status,
        requisitionId: req.id,
        stage: formatStageName(stage)
      }
    })

    console.log('loadDashboardStats: Calculated all metrics successfully')

    return {
      totalRequisitions,
      activeRequisitions,
      pendingApprovals,
      totalSpent,
      totalSubmitted,
      totalApproved,
      recentCount,
      monthlyData,
      projectStats,
      statusBreakdown,
      recentActivity
    }
  } catch (error) {
    console.error('loadDashboardStats: Unexpected error:', error)
    throw error
  }
}

export async function getAvailableProjects(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('requisitions')
      .select('project_name')
      .not('project_name', 'is', null)
    
    if (error) {
      console.error('Error loading projects:', error)
      return []
    }
    
    // Get unique project names
    const uniqueProjects = [...new Set(data?.map(item => item.project_name) || [])]
    return uniqueProjects.sort()
  } catch (error) {
    console.error('Error getting available projects:', error)
    return []
  }
}

