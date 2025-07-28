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

export default function RequisitionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [requisition, setRequisition] = useState<Requisition | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  const [showTopDocumentWarning, setShowTopDocumentWarning] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [pendingTopCompletion, setPendingTopCompletion] = useState<{ stage: WorkflowStage; comments: string } | null>(null)
  const bottomPanelRef = useRef<HTMLDivElement>(null)
  const [savedForLaterExpanded, setSavedForLaterExpanded] = useState(false)
  const [week, setWeek] = useState<string>(requisition?.week || "")

  // Get user role from authenticated user
  const userRole = user?.role as UserRole | undefined

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

  // Add effect to update requisition when week changes
  useEffect(() => {
    if (requisition && week !== requisition.week) {
      const updatedRequisition = {
        ...requisition,
        week,
        lastModified: new Date().toISOString()
      }
      setRequisition(updatedRequisition)
      
      // Save to Supabase
      saveRequisition(updatedRequisition, user?.fullName)
        .catch(error => {
          console.error('Failed to save week date:', error)
          toast({
            title: "Error",
            description: "Failed to save week date",
            variant: "destructive",
          })
        })
    }
  }, [week, requisition])

  // Also update the initial week state when requisition loads
  useEffect(() => {
    if (requisition?.week) {
      setWeek(requisition.week)
    }
  }, [requisition?.week])

  useEffect(() => {
    // Only load requisition if auth is not loading and we have a user
    if (!authLoading && user) {
      // Load requisition
      loadRequisition(params.id as string)
        .then(data => {
          if (data) {
            setRequisition(data)
          }
          setLoading(false)
        })
        .catch(error => {
          console.error('Failed to load requisition:', error)
          toast({
            title: "Error",
            description: "Failed to load requisition",
            variant: "destructive",
          })
          setLoading(false)
        })
    }
  }, [params.id, authLoading, user])

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
      description: `${STAGE_LABELS[stage]} stage completed successfully`,
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

  const handleCommentsChange = (field: string, value: string) => {
    if (!requisition) return
    setRequisition({
      ...requisition,
      [field]: value,
      lastModified: new Date().toISOString(),
    })
  }

  const getValidationErrors = () => {
    if (!requisition || !userRole) return [];
    const errors: string[] = [];

    switch (userRole) {
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
          if (!item.supplier) errors.push(`Item ${index + 1}: Supplier is required`)
          if (!item.priceUnit || item.priceUnit <= 0)
            errors.push(`Item ${index + 1}: Price per unit must be greater than 0`)
          if (!item.total || item.total <= 0) errors.push(`Item ${index + 1}: Total must be greater than 0`)
        })
        break
      case "treasury":
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



  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-500">Loading authentication...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading if no user (not authenticated)
  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-500">Please sign in to view this requisition</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error if user doesn't have a role
  if (!userRole) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Access Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Unable to determine your role. Please contact support.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-500">Loading requisition...</div>
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
            <div className="text-gray-500">Requisition not found</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link href="/requisitions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-900">{requisition.requisitionNumber}</h1>
              <Badge className={cn("text-sm", getStatusColor(requisition.status))}>
                {STATUS_LABELS[requisition.status]}
              </Badge>
            </div>
            <p className="text-gray-600 mt-2">Project: {requisition.projectName}</p>
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
                Complete Stage
              </Button>
            )}
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
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
              <CardTitle>Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-x-8 text-sm">
              {/* Column 1 */}
              <div>
                <div className="flex items-center gap-2 h-9">
                  <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {(() => {
                      const [year, month, day] = requisition.createdDate.split('T')[0].split('-');
                      return `${month}/${day}/${year}`;
                    })()}
                  </div>
                </div>
                                <div className="flex items-center gap-2 h-9 mt-4">
                  <Briefcase className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Project Name:</span>{" "}
                    {requisition.projectName}
                  </div>
                </div>
                <div className="flex items-center gap-2 h-9 mt-4">
                  <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Your Role:</span>{" "}
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
                    <span className="font-medium">Current Stage:</span>{" "}
                    {STAGE_LABELS[requisition.currentStage]}
                  </div>
                </div>
                <div className="flex items-center gap-2 h-9 mt-4">
                  <CalendarRange className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="font-medium whitespace-nowrap">Week:</span>
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
                    <span className="font-medium">Items:</span>{" "}
                    {requisition.items.length}
                  </div>
                </div>
                <div className="flex items-center gap-2 h-9 mt-4">
                  <Files className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Documents:</span>{" "}
                    {requisition.documents.length}
                  </div>
                </div>
              </div>

              {/* Column 4 */}
              <div>
                <div className="flex items-center gap-2 h-9">
                  <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Total Submitted:</span>{" "}$
                    {requisition.items.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2 h-9 mt-4">
                  <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Total Approved:</span>{" "}$
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
            <CardTitle>Workflow Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <StageProgress currentStage={requisition.currentStage} completedStages={getCompletedStages()} />
          </CardContent>
        </Card>

        {/* Material Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Material Items</CardTitle>
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
                  <span>Saved for Later ({requisition.items.filter(item => item.approvalStatus === "Save for Later").length})</span>
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
                              Saved for Later
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">Description:</span>
                              <p>{item.description}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Amount:</span>
                              <p>{item.amount} {item.unit}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Total:</span>
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
              <span>Stage Comments</span>
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
                Validation Errors
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600 mb-4">
                Please fix the following issues before completing the stage:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {getValidationErrors().map((error, index) => (
                  <li key={index} className="text-sm text-red-600">{error}</li>
                ))}
              </ul>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowValidationErrors(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setShowValidationErrors(false);
                // Scroll to bottom panel
                bottomPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}>
                View Details
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
                No Documents Uploaded
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600 mb-4">
                You are marking the <strong>{pendingTopCompletion?.stage ? STAGE_LABELS[pendingTopCompletion.stage] : ''}</strong> stage as complete, but no documents have been uploaded for this stage.
              </p>
              <p className="text-sm text-gray-600">
                It is recommended to upload relevant documents before completing the stage. However, you can still proceed if needed.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setPendingTopCompletion(null)
                setShowTopDocumentWarning(false)
              }}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (pendingTopCompletion) {
                  handleStageComplete(pendingTopCompletion.stage, pendingTopCompletion.comments, true)
                }
              }}>
                Complete Stage Anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
