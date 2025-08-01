"use client"

import { useState } from "react"
import type { Requisition, UserRole, WorkflowStage } from "@/types"
import { stageCompletionRules, canUserAccessStage } from "@/lib/permissions"
import { STAGE_LABELS } from "@/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CheckCircle, AlertCircle, Clock, FileText } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

interface StageCompletionPanelProps {
  requisition: Requisition
  userRole: UserRole
  onComplete: (stage: WorkflowStage, comments: string) => void
}

export function StageCompletionPanel({ requisition, userRole, onComplete }: StageCompletionPanelProps) {
  const { t } = useLanguage()
  const [comments, setComments] = useState("")
  const [isCompleting, setIsCompleting] = useState(false)
  const [showDocumentWarning, setShowDocumentWarning] = useState(false)
  const [pendingCompletion, setPendingCompletion] = useState<{ stage: WorkflowStage; comments: string } | null>(null)

  const currentStage = requisition.currentStage
  const canAccessCurrentStage = canUserAccessStage(userRole, currentStage)
  const isStageComplete = (requisition as any)[`${currentStage}Complete`]
  const canComplete = stageCompletionRules[currentStage]?.(requisition)

  // Check if documents exist for the current stage (excluding CEO stage)
  const hasDocumentsForStage = () => {
    if (currentStage === "ceo") return true // Skip document check for CEO stage
    return requisition.documents && requisition.documents.some(doc => doc.stage === currentStage)
  }

  const handleComplete = async () => {
    if (!canComplete || !canAccessCurrentStage) return

    // Check if documents exist for this stage (excluding CEO)
    if (!hasDocumentsForStage()) {
      setPendingCompletion({ stage: currentStage, comments })
      setShowDocumentWarning(true)
      return
    }

    // Proceed with completion if documents exist or it's CEO stage
    setIsCompleting(true)
    try {
      await onComplete(currentStage, comments)
      setComments("")
    } finally {
      setIsCompleting(false)
    }
  }

  const handleConfirmCompletion = async () => {
    if (!pendingCompletion) return

    setIsCompleting(true)
    try {
      await onComplete(pendingCompletion.stage, pendingCompletion.comments)
      setComments("")
      setPendingCompletion(null)
      setShowDocumentWarning(false)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleCancelCompletion = () => {
    setPendingCompletion(null)
    setShowDocumentWarning(false)
  }

  const getValidationErrors = () => {
    const errors: string[] = []
    
    // Determine which stage is being completed by checking which stage is not complete
    // and matches the current stage or the stage before it
    const completedStages: WorkflowStage[] = []
    if (requisition.residentComplete) completedStages.push("resident")
    if (requisition.procurementComplete) completedStages.push("procurement")
    if (requisition.treasuryComplete) completedStages.push("treasury")
    if (requisition.ceoComplete) completedStages.push("ceo")
    if (requisition.paymentComplete) completedStages.push("payment")
    if (requisition.storekeeperComplete) completedStages.push("storekeeper")
    
    // Find the stage being completed (the first incomplete stage)
    const allStages: WorkflowStage[] = ["resident", "procurement", "treasury", "ceo", "payment", "storekeeper"]
    const stageBeingCompleted = allStages.find(stage => !completedStages.includes(stage)) || currentStage
    


    switch (stageBeingCompleted) {
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

  const validationErrors = getValidationErrors()

  if (!canAccessCurrentStage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Stage Completion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to complete this stage. Current stage: {t(`requisitionDetail.stages.${currentStage}`)}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (isStageComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            {t('requisitionDetail.stageCompletion.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{t('requisitionDetail.stageCompletion.message')}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            {t('requisitionDetail.stageCompletion.completeStage')} {t(`requisitionDetail.stages.${currentStage}`)} {t('requisitionDetail.stageCompletion.stage')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Please fix the following issues:</div>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('requisitionDetail.stageCompletion.commentsFor')} {t(`requisitionDetail.stages.${currentStage}`)} {t('requisitionDetail.stageCompletion.stage')}:</label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={`${t('requisitionDetail.stageCompletion.addCommentsFor')} ${t(`requisitionDetail.stages.${currentStage}`)} ${t('requisitionDetail.stageCompletion.stage')}...`}
              rows={3}
            />
          </div>

          <Button
            onClick={handleComplete}
            disabled={!canComplete || isCompleting || validationErrors.length > 0}
            className="w-full"
          >
            {isCompleting ? t('requisitionDetail.stageCompletion.completing') : `${t('requisitionDetail.stageCompletion.completeStage')} ${t(`requisitionDetail.stages.${currentStage}`)} ${t('requisitionDetail.stageCompletion.stage')}`}
          </Button>

          {!canComplete && validationErrors.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('requisitionDetail.stageCompletion.allRequiredFields')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Document Warning Dialog */}
      <Dialog open={showDocumentWarning} onOpenChange={setShowDocumentWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-yellow-500" />
              {t('requisitionDetail.stageCompletion.noDocumentsUploaded')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              {t('requisitionDetail.stageCompletion.noDocumentsWarning')} <strong>{t(`requisitionDetail.stages.${currentStage}`)}</strong> {t('requisitionDetail.stageCompletion.stageAsComplete')}
            </p>
            <p className="text-sm text-gray-600">
              {t('requisitionDetail.stageCompletion.recommendedToUpload')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelCompletion}>
              {t('requisitionDetail.materialModal.cancel')}
            </Button>
            <Button onClick={handleConfirmCompletion} disabled={isCompleting}>
              {isCompleting ? t('requisitionDetail.stageCompletion.completing') : t('requisitionDetail.stageCompletion.completeStageAnyway')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
