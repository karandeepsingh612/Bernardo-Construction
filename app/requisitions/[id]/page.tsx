"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import type { Requisition, UserRole, WorkflowStage } from "@/types"
import { loadRequisition, saveRequisition } from "@/lib/requisitionService"
import { getNextStage, stageCompletionRules, canUserAccessStage } from "@/lib/permissions"
import { RoleSelector } from "@/components/role-selector"
import { StageProgress } from "@/components/stage-progress"
import { MaterialItemsTable } from "@/components/material-items-table"
import { StageCompletionPanel } from "@/components/stage-completion-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { STATUS_LABELS, STAGE_LABELS } from "@/types"
import { ArrowLeft, Save, FileText, Calendar, User, ChevronDown, ChevronRight, AlertCircle, BookmarkIcon, DollarSign, Briefcase, GitBranch, CalendarRange, ListChecks, Files } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { DocumentUpload } from "@/components/document-upload"
import { DatePicker } from "@/components/date-picker"
import { useAuth } from "@/lib/auth/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { useLanguage } from "@/lib/language-context"

function RequisitionDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const [requisition, setRequisition] = useState<Requisition | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  const [showTopDocumentWarning, setShowTopDocumentWarning] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [pendingTopCompletion, setPendingTopCompletion] = useState<{ stage: WorkflowStage; comments: string } | null>(null)
  const bottomPanelRef = useRef<HTMLDivElement>(null)
  const [savedForLaterExpanded, setSavedForLaterExpanded] = useState(false)
  const [week, setWeek] = useState<string>("")

  // Get user role from authenticated user
  const userRole = user?.role as UserRole | undefined

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Helper functions for role display
  const getRoleDisplayName = (role: UserRole): string => {
    switch (role) {
      case "resident": return "Resident"
      case "procurement": return "Procurement"
      case "treasury": return "Treasury"
      case "ceo": return "CEO"
      case "storekeeper": return "Storekeeper"
      default: return "Unknown"
    }
  }

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case "resident": return "bg-blue-100 text-blue-800"
      case "procurement": return "bg-green-100 text-green-800"
      case "treasury": return "bg-purple-100 text-purple-800"
      case "ceo": return "bg-orange-100 text-orange-800"
      case "storekeeper": return "bg-pink-100 text-pink-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  // Simple loading logic - like catalog page
  useEffect(() => {
    async function fetchRequisition() {
      if (!authLoading && user && params.id) {
        setLoading(true)
        try {
          const data = await loadRequisition(params.id as string)
          if (data) {
            setRequisition(data)
            setWeek(data.week || "")
          }
        } catch (error) {
          console.error('Failed to load requisition:', error)
          toast({
            title: "Error",
            description: "Failed to load requisition",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }
    }
    fetchRequisition()
  }, [params.id, authLoading, user])

  // Update week when requisition changes
  useEffect(() => {
    if (requisition?.week) {
      setWeek(requisition.week)
    }
  }, [requisition?.week])

  // Auto-save week field when it changes
  useEffect(() => {
    if (!requisition || !week) return

    // Only save if week has actually changed from the requisition's week
    if (week === requisition.week) return

    // Debounce the save to avoid too many API calls
    const timeoutId = setTimeout(async () => {
      try {
        const updatedRequisition = {
          ...requisition,
          week,
          lastModified: new Date().toISOString(),
        }
        
        await saveRequisition(updatedRequisition, user?.fullName)
        setRequisition(updatedRequisition)
        
        toast({
          title: "Week Updated",
          description: "Week field saved successfully",
        })
      } catch (error) {
        console.error('Failed to save week:', error)
        toast({
          title: "Error",
          description: "Failed to save week field",
          variant: "destructive",
        })
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [week, requisition, user?.fullName])

  const handleSave = async () => {
    if (!requisition) return

    setIsSaving(true)
    try {
      const updatedRequisition = {
              ...requisition,
              lastModified: new Date().toISOString(),
            }
      
      await saveRequisition(updatedRequisition, user?.fullName)

      toast({
        title: "Success",
        description: "Requisition saved successfully",
      })
    } catch (error) {
      console.error('Failed to save requisition:', error)
      toast({
        title: "Error",
        description: "Failed to save requisition",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Check if documents exist for the current stage (excluding CEO stage)
  const hasDocumentsForStage = (stage: WorkflowStage) => {
    if (stage === "ceo") return true // Skip document check for CEO stage
    return requisition?.documents && requisition.documents.some(doc => doc.stage === stage)
  }

  const handleStageComplete = async (stage: WorkflowStage, comments: string, skipDocumentCheck: boolean = false) => {
    if (!requisition) return

    // Check for documents if not skipping the check
    if (!skipDocumentCheck && !hasDocumentsForStage(stage)) {
      setPendingTopCompletion({ stage, comments })
      setShowTopDocumentWarning(true)
      return
    }

    const updatedRequisition = { ...requisition }

    // Mark stage as complete
    ;(updatedRequisition as any)[`${stage}Complete`] = true

    // Update comments
    ;(updatedRequisition as any)[`${stage}Comments`] = comments

    // Move to next stage
    const nextStage = getNextStage(stage)
    if (nextStage) {
      updatedRequisition.currentStage = nextStage
      updatedRequisition.status = `pending-${nextStage}` as any
    } else {
      updatedRequisition.status = "completed"
    }

    updatedRequisition.lastModified = new Date().toISOString()

    try {
      await saveRequisition(updatedRequisition, user?.fullName)
    setRequisition(updatedRequisition)

    toast({
      title: "Stage Completed",
      description: `${t(`requisitionDetail.stages.${stage}`)} stage completed successfully`,
    })

      // Reset states
      setPendingTopCompletion(null)
      setShowTopDocumentWarning(false)
    } catch (error) {
      console.error('Failed to complete stage:', error)
      toast({
        title: "Error",
        description: "Failed to complete stage",
        variant: "destructive",
      })
    }
  }

  const handleItemsChange = async (items: any[]) => {
    if (!requisition) return;
    
    const updatedRequisition = {
      ...requisition,
      items,
      lastModified: new Date().toISOString(),
    };

    try {
      await saveRequisition(updatedRequisition, user?.fullName)
      setRequisition(updatedRequisition)
    } catch (error) {
      console.error('Failed to update items:', error)
      toast({
        title: "Error",
        description: "Failed to update items",
        variant: "destructive",
      })
    }
  }

  const handleCommentsChange = async (field: string, value: string) => {
    if (!requisition) return
    
    // Update local state immediately
    const updatedRequisition = {
      ...requisition,
      [field]: value,
      lastModified: new Date().toISOString(),
    }
    setRequisition(updatedRequisition)
    
    // Auto-save to Supabase with debounce
    const timeoutId = setTimeout(async () => {
      try {
        await saveRequisition(updatedRequisition, user?.fullName)
        toast({
          title: "Comments Saved",
          description: "Comments saved successfully",
        })
      } catch (error) {
        console.error('Failed to save comments:', error)
        toast({
          title: "Error",
          description: "Failed to save comments",
          variant: "destructive",
        })
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }

  const getValidationErrors = () => {
    if (!requisition) return [];
    const errors: string[] = [];

    // Determine which stage is being completed by checking which stage is not complete
    const completedStages: WorkflowStage[] = []
    if (requisition.residentComplete) completedStages.push("resident")
    if (requisition.procurementComplete) completedStages.push("procurement")
    if (requisition.treasuryComplete) completedStages.push("treasury")
    if (requisition.ceoComplete) completedStages.push("ceo")
    if (requisition.paymentComplete) completedStages.push("payment")
    if (requisition.storekeeperComplete) completedStages.push("storekeeper")
    
    // Find the stage being completed (the first incomplete stage)
    const allStages: WorkflowStage[] = ["resident", "procurement", "treasury", "ceo", "payment", "storekeeper"]
    const stageToValidate = allStages.find(stage => !completedStages.includes(stage)) || requisition.currentStage
    


    switch (stageToValidate) {
      case "resident":
        requisition.items.forEach((item, index) => {
          if (!item.description) errors.push(`Item ${index + 1}: Description is required`)
          if (!item.classification) errors.push(`Item ${index + 1}: Classification is required`)
          if (!item.amount || item.amount <= 0) errors.push(`Item ${index + 1}: Amount must be greater than 0`)
          if (!item.unit) errors.push(`Item ${index + 1}: Unit is required`)
        })
        break
      case "procurement":
        requisition.items.forEach((item, index) => {
          // Basic information (since procurement can add this)
          if (!item.description) errors.push(`Item ${index + 1}: Description is required`)
          if (!item.classification) errors.push(`Item ${index + 1}: Classification is required`)
          if (!item.amount || item.amount <= 0) errors.push(`Item ${index + 1}: Amount must be greater than 0`)
          if (!item.unit) errors.push(`Item ${index + 1}: Unit is required`)
          // Procurement-specific information
          if (!item.supplier) errors.push(`Item ${index + 1}: Supplier is required`)
          if (!item.priceUnit || item.priceUnit <= 0)
            errors.push(`Item ${index + 1}: Price per unit must be greater than 0`)
          if (!item.total || item.total <= 0) errors.push(`Item ${index + 1}: Total must be greater than 0`)
        })
        break
      case "treasury":
        // Treasury can always complete their stage
        break
      case "ceo":
        requisition.items.forEach((item, index) => {
          if (item.approvalStatus === "pending") errors.push(`Item ${index + 1}: Approval status must be set`)
        })
        break
      case "payment":
        requisition.items.forEach((item, index) => {
          if (item.approvalStatus === "approved" && item.paymentStatus !== "completed") {
            errors.push(`Item ${index + 1}: Payment must be completed for approved items`)
          }
        })
        break
      case "storekeeper":
        requisition.items.forEach((item, index) => {
          // Skip delivery validation for items that are not approved (Save for Later or Rejected)
          if (item.approvalStatus === "Save for Later" || item.approvalStatus === "rejected") {
            return // Skip this item
          }
          
          if (!item.deliveryStatus || item.deliveryStatus !== "Complete") {
            errors.push(`Item ${index + 1}: Delivery must be fully completed before this stage can be completed.`)
          }
        })
        break
    }

    return errors
  }

  const handleDocumentsChange = async (documents: any[]) => {
    if (!requisition) return

    const updatedRequisition = {
      ...requisition,
      documents,
      lastModified: new Date().toISOString(),
    }

    try {
      await saveRequisition(updatedRequisition, user?.fullName)
      setRequisition(updatedRequisition)
    } catch (error) {
      console.error('Failed to update documents:', error)
      toast({
        title: "Error",
        description: "Failed to update documents",
        variant: "destructive",
    })
    }
  }

  const getCompletedStages = (): WorkflowStage[] => {
    if (!requisition) return []
    const stages: WorkflowStage[] = []
    if (requisition.residentComplete) stages.push("resident")
    if (requisition.procurementComplete) stages.push("procurement")
    if (requisition.treasuryComplete) stages.push("treasury")
    if (requisition.ceoComplete) stages.push("ceo")
    if (requisition.paymentComplete) stages.push("payment")
    if (requisition.storekeeperComplete) stages.push("storekeeper")
    return stages
  }

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



  // Show loading skeleton while auth is loading or requisition is loading
  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">{t('requisitionDetail.messages.loading')}</span>
        </div>
        <LoadingSkeleton type="page" />
      </div>
    )
  }

  // Show error if user doesn't have a role
  if (!userRole) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t('requisitionDetail.messages.accessError')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('requisitionDetail.messages.unableToDetermineRole')}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!requisition) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-500">{t('requisitionDetail.messages.notFound')}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-start gap-4">
          <Link href="/requisitions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('requisitionDetail.backToRequisitions')}
            </Button>
          </Link>
          <div className="flex-1">
            {/* Requisition ID and Status Header */}
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                {requisition.requisitionNumber}
              </h1>
              <Badge className={cn("text-sm font-medium", getStatusColor(requisition.status))}>
                {t(`requisitions.status.${requisition.status}`)}
              </Badge>
            </div>
            {/* Project Info */}
            <p className="text-gray-600 text-sm">{t('common.project')}: {requisition.projectName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {canUserAccessStage(userRole, requisition.currentStage) && (
              <Button 
                variant="default" 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  const comments = (requisition as any)[`${userRole}Comments`] || '';
                  // Check if stage can be completed based on validation rules
                  const validationErrors = getValidationErrors();
                  if (validationErrors.length > 0) {
                    setShowValidationErrors(true);
                    return;
                  }
                  handleStageComplete(requisition.currentStage, comments);
                }}
              >
                {t('requisitionDetail.actions.completeStage')}
              </Button>
            )}
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? t('common.loading') : t('common.save')}
          </Button>
          </div>
          <RoleSelector userRole={userRole} />
        </div>
      </div>

      <div className="space-y-6">
        {/* Project Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>{t('requisitionDetail.details')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-x-8 text-sm">
              {/* Column 1 */}
              <div>
                <div className="flex items-center gap-2 h-9">
                  <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{t('requisitionDetail.created')}:</span>{" "}
                    {(() => {
                      const [year, month, day] = requisition.createdDate.split('T')[0].split('-');
                      return `${month}/${day}/${year}`;
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2 h-9 mt-4">
                  <Briefcase className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{t('requisitionDetail.projectName')}:</span>{" "}
                    {requisition.projectName}
                  </div>
                </div>
                <div className="flex items-center gap-2 h-9 mt-4">
                  <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{t('requisitionDetail.yourRole')}:</span>{" "}
                    <Badge className={getRoleColor(userRole)}>
                      {getRoleDisplayName(userRole)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Column 2 */}
              <div>
                <div className="flex items-center gap-2 h-9">
                  <GitBranch className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{t('requisitionDetail.currentStage')}:</span>{" "}
                    {t(`requisitionDetail.stages.${requisition.currentStage}`)}
                  </div>
                </div>
                <div className="flex items-center gap-2 h-9 mt-4">
                  <CalendarRange className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="font-medium whitespace-nowrap">{t('requisitionDetail.week')}:</span>
                    <DatePicker 
                      date={week} 
                      setDate={setWeek}
                      className="w-[120px]"
                    />
                  </div>
                </div>
              </div>

              {/* Column 3 */}
              <div>
                <div className="flex items-center gap-2 h-9">
                  <ListChecks className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{t('requisitionDetail.items')}:</span>{" "}
                    {requisition.items.length}
                  </div>
                </div>
                <div className="flex items-center gap-2 h-9 mt-4">
                  <Files className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{t('requisitionDetail.documents')}:</span>{" "}
                    {requisition.documents.length}
                  </div>
                </div>
              </div>

              {/* Column 4 */}
              <div>
                <div className="flex items-center gap-2 h-9">
                  <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{t('requisitionDetail.totalSubmitted')}:</span>{" "}$
                    {requisition.items.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2 h-9 mt-4">
                  <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{t('requisitionDetail.totalApproved')}:</span>{" "}$
                    {requisition.items.reduce((sum, item) => sum + (item.approvalStatus === "approved" ? (item.total || 0) : 0), 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stage Progress */}
        <Card>
          <CardHeader>
            <CardTitle>{t('requisitionDetail.workflowStages')}</CardTitle>
          </CardHeader>
          <CardContent>
            <StageProgress currentStage={requisition.currentStage} completedStages={getCompletedStages()} />
          </CardContent>
        </Card>

        {/* Material Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('requisitionDetail.materials')}</CardTitle>
          </CardHeader>
          <CardContent>
            <MaterialItemsTable
              items={requisition.items}
              onItemsChange={handleItemsChange}
              userRole={userRole || "resident"}
              requisitionId={requisition.id}
              currentStage={requisition.currentStage}
            />
          </CardContent>
        </Card>

        {/* Save for Later Items */}
        {requisition.items.some(item => item.approvalStatus === "Save for Later") && (
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setSavedForLaterExpanded(!savedForLaterExpanded)}
            >
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookmarkIcon className="h-5 w-5 text-purple-500" />
                  <span>{t('requisitionDetail.status.saveForLater')} ({requisition.items.filter(item => item.approvalStatus === "Save for Later").length})</span>
                </div>
                {savedForLaterExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
            {savedForLaterExpanded && (
              <CardContent>
                <div className="space-y-4">
                  {requisition.items
                    .filter(item => item.approvalStatus === "Save for Later")
                    .map((item, index) => (
                      <div key={item.id} className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">#{index + 1}</span>
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                              {t('requisitionDetail.status.saveForLater')}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">{t('requisitionDetail.description')}:</span>
                              <p>{item.description}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">{t('requisitionDetail.quantity')}:</span>
                              <p>{item.amount} {item.unit}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">{t('requisitionDetail.totalAmount')}:</span>
                              <p>${item.total?.toFixed(2) || '0.00'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Document Upload */}
        <DocumentUpload
          documents={requisition.documents || []}
          onDocumentsChange={handleDocumentsChange}
          userRole={userRole || "resident"}
          currentStage={requisition.currentStage}
          requisitionId={requisition.id}
          userName={user?.fullName}
        />

        {/* Stage Comments - Collapsible */}
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setCommentsExpanded(!commentsExpanded)}
          >
            <CardTitle className="flex items-center justify-between">
              <span>{t('requisitionDetail.messages.stageComments')}</span>
              {commentsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
          {commentsExpanded && (
            <CardContent className="space-y-4">
              {[
                { stage: "resident", label: "Resident Comments", field: "residentComments" },
                { stage: "procurement", label: "Procurement Comments", field: "procurementComments" },
                { stage: "treasury", label: "Treasury Comments", field: "treasuryComments" },
                { stage: "ceo", label: "CEO Comments", field: "ceoComments" },
                { stage: "payment", label: "Payment Comments", field: "paymentComments" },
                { stage: "storekeeper", label: "Storekeeper Comments", field: "storekeeperComments" },
              ].map(({ stage, label, field }) => (
                <div key={stage}>
                  <Label className="text-sm font-medium">{label}</Label>
                  <Textarea
                    value={(requisition as any)[field] || ""}
                    onChange={(e) => handleCommentsChange(field, e.target.value)}
                    placeholder={`Add ${label.toLowerCase()}...`}
                    rows={2}
                    disabled={userRole !== stage}
                    className={cn(userRole !== stage && "bg-gray-50")}
                  />
                  {stage !== "storekeeper" && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Stage Completion Panel */}
        <div ref={bottomPanelRef}>
        {userRole && (
            <StageCompletionPanel requisition={requisition} userRole={userRole} onComplete={(stage, comments) => handleStageComplete(stage, comments, true)} />
        )}
        </div>

        {/* Validation Errors Dialog */}
        <Dialog open={showValidationErrors} onOpenChange={setShowValidationErrors}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                {t('requisitionDetail.messages.validationErrors')}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600 mb-4">
                {t('requisitionDetail.messages.fixIssuesBeforeCompleting')}
              </p>
              <ul className="list-disc list-inside space-y-1">
                {getValidationErrors().map((error, index) => (
                  <li key={index} className="text-sm text-red-600">{error}</li>
                ))}
              </ul>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowValidationErrors(false)}>
                {t('common.close')}
              </Button>
              <Button onClick={() => {
                setShowValidationErrors(false);
                // Scroll to bottom panel
                bottomPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}>
                {t('requisitionDetail.messages.viewDetails')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document Warning Dialog */}
        <Dialog open={showTopDocumentWarning} onOpenChange={setShowTopDocumentWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-yellow-500" />
                {t('requisitionDetail.messages.noDocumentsUploaded')}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600 mb-4">
                {t('requisitionDetail.messages.noDocumentsWarning').replace('{stage}', pendingTopCompletion?.stage ? t(`requisitionDetail.stages.${pendingTopCompletion.stage}`) : '')}
              </p>
              <p className="text-sm text-gray-600">
                {t('requisitionDetail.messages.recommendedToUpload')}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setPendingTopCompletion(null)
                setShowTopDocumentWarning(false)
              }}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => {
                if (pendingTopCompletion) {
                  handleStageComplete(pendingTopCompletion.stage, pendingTopCompletion.comments, true)
                }
              }}>
                {t('requisitionDetail.messages.completeStageAnyway')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function RequisitionDetailPage() {
  return (
    <ProtectedRoute>
      <RequisitionDetailPageContent />
    </ProtectedRoute>
  )
}
