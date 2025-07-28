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

export default function NewRequisitionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
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
    // Generate requisition number
    setRequisition((prev) => ({
      ...prev,
      requisitionNumber: generateRequisitionNumber(),
    }))
  }, [])

  const handleSave = async (isDraft = true) => {
    if (!requisition.projectName.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive",
      })
      return
    }

    if (requisition.items.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one material item is required",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const updatedRequisition = {
        ...requisition,
        lastModified: new Date().toISOString(),
        status: isDraft ? "draft" as const : "pending-procurement" as const,
      }

      console.log('Saving requisition:', JSON.stringify(updatedRequisition, null, 2))
      await saveRequisition(updatedRequisition, user?.fullName)

      toast({
        title: "Success",
        description: `Requisition ${isDraft ? "saved as draft" : "created"} successfully`,
      })

      router.push(`/requisitions/${requisition.id}`)
    } catch (error) {
      console.error("Error saving requisition:", error)
      toast({
        title: "Error",
        description: "Failed to save requisition",
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
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
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

  // Only allow resident and procurement roles to create requisitions
  if (userRole !== 'resident' && userRole !== 'procurement') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Only Resident or Procurement roles can create a requisition.</AlertDescription>
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
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Requisition</h1>
            <p className="text-gray-600 mt-2">Requisition Number: {requisition.requisitionNumber}</p>
          </div>
        </div>
        <RoleSelector userRole={userRole} />
      </div>

      <div className="space-y-6">
        {/* Project Information */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={requisition.projectName}
                  onChange={(e) => handleProjectNameChange(e.target.value)}
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="createdDate">Created Date</Label>
                <Input id="createdDate" value={requisition.createdDate} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Material Items */}
        <Card>
          <CardHeader>
            <CardTitle>Material Items</CardTitle>
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
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  value={requisition.residentComments}
                  onChange={(e) => handleCommentsChange(e.target.value)}
                  placeholder="Add any additional comments..."
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => handleSave(true)} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save as Draft"}
          </Button>
          <Button onClick={() => handleSave(false)} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Creating..." : "Create Requisition"}
          </Button>
        </div>
      </div>
    </div>
  )
}
