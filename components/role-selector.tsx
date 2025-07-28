"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UserRole } from "@/types"
import { User } from "lucide-react"

interface RoleSelectorProps {
  userRole: UserRole | null
}

export function RoleSelector({ userRole }: RoleSelectorProps) {
  const roles: { value: UserRole; label: string }[] = [
    { value: "resident", label: "Resident" },
    { value: "procurement", label: "Procurement" },
    { value: "treasury", label: "Treasury" },
    { value: "ceo", label: "CEO" },
    { value: "storekeeper", label: "Storekeeper" },
  ]

  if (!userRole) {
    return (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <Select value="" disabled>
          <SelectTrigger className="w-40 bg-gray-50 border-gray-300 text-gray-600">
            <SelectValue placeholder="Loading..." />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-muted-foreground" />
      <Select value={userRole} disabled>
        <SelectTrigger className="w-40 bg-blue-50 border-blue-300 text-blue-700 font-medium shadow-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
