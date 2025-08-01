"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Requisition, RequisitionItem, UserRole } from "@/types"
import { saveRequisition, generateRequisitionNumber, getLocalDateString } from "@/lib/requisitionService"
import { RoleSelector } from "@/components/role-selector"
import { MaterialItemsTable } from "@/components/material-items-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, ArrowLeft, AlertCircle, User } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from "@/lib/auth/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { useLanguage } from "@/lib/language-context"

function NewRequisitionPageContent() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [isSaving, setIsSaving] = useState(false)
  const [requisition, setRequisition] = useState<Requisition>({
    id: uuidv4(),
    requisitionNumber: "",
    status: "draft",
    createdDate: new Date().toISOString(),
    createdTime: new Date().toLocaleTimeString(),
    lastModified: new Date().toISOString(),
    currentStage: "resident",
    projectId: "",
    projectName: "",
    residentComplete: false,
    procurementComplete: false,
    treasuryComplete: false,
    ceoComplete: false,
    paymentComplete: false,
    storekeeperComplete: false,
    residentComments: "",
    procurementComments: "",
    treasuryComments: "",
    ceoComments: "",
    paymentComments: "",
    storekeeperComments: "",
    items: [],
    documents: [],
  })

  // Get user role from authenticated user
  const userRole = user?.role as UserRole

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    // Generate requisition number
    setRequisition((prev) => ({
      ...prev,
      requisitionNumber: generateRequisitionNumber(),
    }))
  }, [])

  const handleSave = async (isDraft = true) => {
    if (!requisition.projectName.trim()) {
      toast({
        title: t('newRequisition.validationError'),
        description: t('newRequisition.projectNameRequiredError'),
        variant: "destructive",
      })
      return
    }

    if (requisition.items.length === 0) {
      toast({
        title: t('newRequisition.validationError'),
        description: t('newRequisition.materialItemsRequiredError'),
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const updatedRequisition = {
        ...requisition,
        lastModified: new Date().toISOString(),
        status: isDraft ? "draft" as const : "pending-resident" as const,
      }

      console.log('Saving requisition:', JSON.stringify(updatedRequisition, null, 2))
      await saveRequisition(updatedRequisition, user?.fullName)

      toast({
        title: t('newRequisition.success'),
        description: `Requisition ${isDraft ? t('newRequisition.savedAsDraft') : t('newRequisition.createdSuccessfully')}`,
      })

      router.push(`/requisitions/${requisition.id}`)
    } catch (error) {
      console.error("Error saving requisition:", error)
      toast({
        title: t('newRequisition.error'),
        description: t('newRequisition.failedToSave'),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleItemsChange = (items: RequisitionItem[]) => {
    setRequisition((prev) => ({
      ...prev,
      items,
    }))
  }

  const handleProjectNameChange = (projectName: string) => {
    setRequisition((prev) => ({
      ...prev,
      projectName,
    }))
  }

  const handleCommentsChange = (comments: string) => {
    setRequisition((prev) => ({
      ...prev,
      residentComments: comments,
    }))
  }

  // Show loading state while user data is being fetched
  if (!user) {
    return <LoadingSkeleton type="page" />
  }

  // Show error if user doesn't have a role
  if (!userRole) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t('newRequisition.accessError')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('newRequisition.unableToDetermineRole')}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Allow resident, procurement, and CEO roles to create requisitions
  if (userRole !== 'resident' && userRole !== 'procurement' && userRole !== 'ceo') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t('newRequisition.accessDenied')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('newRequisition.onlyResidentProcurementCEO')}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <RoleSelector userRole={userRole} />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link href="/requisitions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('newRequisition.back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('newRequisition.title')}</h1>
            <p className="text-gray-600 mt-2">{t('newRequisition.requisitionNumber')}: {requisition.requisitionNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {/* Hide Save as Draft button for now */}
            {/* <Button variant="outline" onClick={() => handleSave(true)} disabled={isSaving} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save as Draft"}
            </Button> */}
            <Button onClick={() => handleSave(false)} disabled={isSaving} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? t('newRequisition.creating') : t('newRequisition.createRequisition')}
            </Button>
          </div>
          <RoleSelector userRole={userRole} />
        </div>
      </div>

      <div className="space-y-6">
        {/* Project Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('newRequisition.projectInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectName">{t('newRequisition.projectNameRequired')}</Label>
                <Input
                  id="projectName"
                  value={requisition.projectName}
                  onChange={(e) => handleProjectNameChange(e.target.value)}
                  placeholder={t('newRequisition.enterProjectName')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="createdDate">{t('newRequisition.createdDate')}</Label>
                <Input id="createdDate" value={requisition.createdDate} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Material Items */}
        <Card>
          <CardHeader>
            <CardTitle>{t('newRequisition.materialItems')}</CardTitle>
          </CardHeader>
          <CardContent>
            <MaterialItemsTable
              items={requisition.items}
              onItemsChange={handleItemsChange}
              userRole={userRole}
              requisitionId={requisition.id}
              currentStage={requisition.currentStage}
            />
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle>{t('newRequisition.comments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="comments">{t('newRequisition.comments')}</Label>
                <Textarea
                  id="comments"
                  value={requisition.residentComments}
                  onChange={(e) => handleCommentsChange(e.target.value)}
                  placeholder={t('newRequisition.addComments')}
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Action Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <Button onClick={() => handleSave(false)} disabled={isSaving} size="lg">
            <Save className="h-5 w-5 mr-2" />
            {isSaving ? t('newRequisition.creating') : t('newRequisition.createRequisition')}
          </Button>
        </div>

      </div>
    </div>
  )
}

export default function NewRequisitionPage() {
  return (
    <ProtectedRoute>
      <NewRequisitionPageContent />
    </ProtectedRoute>
  )
}
