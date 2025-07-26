"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UserRole } from "@/types"
import { saveUserRole } from "@/lib/storage"
import { User } from "lucide-react"

interface RoleSelectorProps {
  onRoleChange: (role: UserRole) => void
  currentRole: UserRole | null
}

export function RoleSelector({ onRoleChange, currentRole }: RoleSelectorProps) {
  const roles: { value: UserRole; label: string }[] = [
    { value: "resident", label: "Resident" },
    { value: "procurement", label: "Procurement" },
    { value: "treasury", label: "Treasury" },
    { value: "ceo", label: "CEO" },
    { value: "storekeeper", label: "Storekeeper" },
  ]

  const handleRoleChange = (role: UserRole) => {
    console.log("Role changing to:", role) // Debug log
    saveUserRole(role)
    onRoleChange(role)
  }

  return (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-muted-foreground" />
      <Select value={currentRole || ""} onValueChange={(value) => handleRoleChange(value as UserRole)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Select Role" />
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
