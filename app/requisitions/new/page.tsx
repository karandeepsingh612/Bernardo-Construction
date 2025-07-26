"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Requisition, RequisitionItem, UserRole } from "@/types"
import { loadUserRole } from "@/lib/storage"
import { saveRequisition, generateRequisitionNumber } from "@/lib/requisitionService"
import { RoleSelector } from "@/components/role-selector"
import { MaterialItemsTable } from "@/components/material-items-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from 'uuid'

export default function NewRequisitionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [requisition, setRequisition] = useState<Requisition>({
    id: uuidv4(),
    requisitionNumber: "",
    status: "draft",
    createdDate: new Date().toISOString().split("T")[0],
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

  useEffect(() => {
    const savedRole = loadUserRole() as UserRole
    if (savedRole) {
      setUserRole(savedRole)
    }

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
      await saveRequisition(updatedRequisition)

      toast({
        title: "Success",
        description: `Requisition ${isDraft ? "saved as draft" : "created"} successfully`,
      })

      router.push(`/requisitions/${requisition.id}`)
    } catch (error) {
      console.error('Failed to save requisition:', error)
      if (error instanceof Error) {
        console.error('Error details:', error.message)
        if ('code' in error) {
          console.error('Error code:', (error as any).code)
        }
        if ('details' in error) {
          console.error('Error details:', (error as any).details)
        }
      }
      toast({
        title: "Error",
        description: "Failed to save requisition. Please check the console for details.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleItemsChange = (items: RequisitionItem[]) => {
    setRequisition((prev) => ({
      ...prev,
      items: items.map(item => ({
        ...item,
        id: item.id || uuidv4(),
        requisitionId: prev.id,
      })),
      lastModified: new Date().toISOString(),
    }))
  }

  const handleProjectNameChange = (projectName: string) => {
    setRequisition((prev) => ({
      ...prev,
      projectName,
      lastModified: new Date().toISOString(),
    }))
  }

  const handleCommentsChange = (comments: string) => {
    setRequisition((prev) => ({
      ...prev,
      residentComments: comments,
      lastModified: new Date().toISOString(),
    }))
  }

  if (!userRole) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Select Your Role</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Please select your role to create a requisition.</AlertDescription>
            </Alert>
            <div className="mt-4">
              <RoleSelector currentRole={userRole} onRoleChange={setUserRole} />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
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
              <RoleSelector currentRole={userRole} onRoleChange={setUserRole} />
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
        <RoleSelector currentRole={userRole} onRoleChange={setUserRole} />
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
            />
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle>Resident Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={requisition.residentComments}
              onChange={(e) => handleCommentsChange(e.target.value)}
              placeholder="Add any comments or special instructions..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => handleSave(true)} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
          <Button onClick={() => handleSave(false)} disabled={isSaving}>
            {isSaving ? "Creating..." : "Create Requisition"}
          </Button>
        </div>
      </div>
    </div>
  )
}
