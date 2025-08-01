import type { WorkflowStage, Requisition, DeliveryRecord, DeliveryStatus } from "@/types"
import type { AuthUser } from '@/types/auth'

export type UserRole = 'resident' | 'procurement' | 'treasury' | 'ceo' | 'storekeeper'

export const ROLE_PERMISSIONS = {
  resident: {
    canManageUsers: false,
    canViewAllProfiles: false,
    canManageCatalog: false,
  },
  procurement: {
    canManageUsers: true,
    canViewAllProfiles: true,
    canManageCatalog: true,
  },
  treasury: {
    canManageUsers: true,
    canViewAllProfiles: true,
    canManageCatalog: false,
  },
  ceo: {
    canManageUsers: true,
    canViewAllProfiles: true,
    canManageCatalog: true,
  },
  storekeeper: {
    canManageUsers: false,
    canViewAllProfiles: false,
    canManageCatalog: true,
  },
} as const

export function canManageUsers(user: AuthUser | null): boolean {
  if (!user) return false
  return user.canManageUsers || false
}

export function canViewAllProfiles(user: AuthUser | null): boolean {
  if (!user) return false
  const role = user.role as UserRole
  return ROLE_PERMISSIONS[role]?.canViewAllProfiles || false
}

export function canManageCatalog(user: AuthUser | null): boolean {
  if (!user) return false
  const role = user.role as UserRole
  return ROLE_PERMISSIONS[role]?.canManageCatalog || false
}

export function isAdmin(user: AuthUser | null): boolean {
  return canManageUsers(user)
}

export function getRoleDisplayName(role: UserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export function getNextStage(currentStage: WorkflowStage): WorkflowStage | null {
  const stages: WorkflowStage[] = ["resident", "procurement", "treasury", "ceo", "payment", "storekeeper"]
  const currentIndex = stages.indexOf(currentStage)
  return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null
}

export function canUserAccessStage(userRole: WorkflowStage | null, stage: WorkflowStage): boolean {
  if (!userRole) return false;
  
  // CEO can access all stages (super user)
  if (userRole === "ceo") {
    return true;
  }
  
  // Treasury role can access both treasury and payment stages
  if (userRole === "treasury") {
    return stage === "treasury" || stage === "payment";
  }
  
  return userRole === stage;
}

export function canUserEditField(role: WorkflowStage | null, field: string): boolean {
  if (!role) return false;
  
  const fieldPermissions: Record<WorkflowStage, string[]> = {
    resident: ["classification", "description", "amount", "unit"],
    procurement: [
      // Basic information fields (so they can create requisitions)
      "classification", "description", "amount", "unit",
      // Procurement-specific fields
      "supplier", "supplier_rfc", "priceUnit", "multiplier"
    ],
    treasury: [
      "paymentStatus", "paymentDate", "paymentAmount", "paymentMethod", "paymentReference", "paymentNumber"
    ],
    ceo: [
      // CEO can edit their own fields
      "approvalStatus", "ceoItemComments",
      // Plus all fields from resident
      "classification", "description", "amount", "unit",
      // Plus all fields from procurement
      "supplier", "supplier_rfc", "priceUnit", "multiplier", "netPrice", "subtotal",
      // Plus all fields from treasury
      "paymentStatus", "paymentDate", "paymentAmount", "paymentMethod", "paymentReference", "paymentNumber",
      // Plus all fields from storekeeper
      "deliveryStatus", "deliveryDate", "quantityReceived", "qualityCheck", "deliveryNotes", "deliveryRecords"
    ],
    payment: [
      "paymentStatus", "paymentDate", "paymentAmount", "paymentMethod", "paymentReference", "paymentNumber"
    ],
    storekeeper: [
      "deliveryStatus", "deliveryDate", "quantityReceived", "qualityCheck", "deliveryNotes", "deliveryRecords"
    ],
  }

  return fieldPermissions[role]?.includes(field) || false
}

export function canUserDeleteMaterial(role: WorkflowStage | null, currentStage: WorkflowStage, approvalStatus?: string): boolean {
  if (!role) return false;

  // Resident can only delete in resident stage
  if (role === "resident") {
    return currentStage === "resident";
  }

  // CEO can delete at any time
  if (role === "ceo") {
    return true;
  }

  // Procurement and Treasury can delete unless item is CEO approved
  if (role === "procurement" || role === "treasury") {
    return approvalStatus !== "approved";
  }

  // All other roles cannot delete
  return false;
}

export function getDeliveryStatus(records: DeliveryRecord[] | undefined | null, targetQuantity: number): DeliveryStatus {
  if (!records || !Array.isArray(records)) return "pending";
  
  const totalQuantity = records.reduce((sum, record) => sum + (record.quantity || 0), 0);

  if (totalQuantity === 0) return "pending";
  if (totalQuantity >= targetQuantity) return "Complete";
  return "partial";
}

export function getTotalQuantityReceived(records: DeliveryRecord[] | undefined | null): number {
  if (!records || !Array.isArray(records)) return 0;
  return records.reduce((sum, record) => sum + (record.quantity || 0), 0);
}

export function getLatestDeliveryDate(records: DeliveryRecord[] | undefined | null): string | null {
  if (!records || !Array.isArray(records) || records.length === 0) return null;
  
  // Sort records by date in descending order and return the first one
  const sortedRecords = [...records].sort((a, b) => {
    if (!a.deliveryDate) return 1;
    if (!b.deliveryDate) return -1;
    return b.deliveryDate.localeCompare(a.deliveryDate);
  });

  return sortedRecords[0].deliveryDate;
}

export const stageCompletionRules: Record<WorkflowStage, (requisition: Requisition) => boolean> = {
  resident: (requisition) => {
    return requisition.items.every(item => 
      item.description && 
      item.classification && 
      item.amount > 0 && 
      item.unit
    );
  },
  procurement: (requisition) => {
    return requisition.items.every(item => 
      // Basic information (since procurement can add this)
      item.description && 
      item.classification && 
      item.amount > 0 && 
      item.unit &&
      // Procurement-specific information
      item.supplier && 
      item.priceUnit > 0 && 
      item.total > 0
    );
  },
  treasury: () => true, // Treasury can always complete their stage
  ceo: () => true, // CEO can always complete any stage (super user)
  payment: (requisition) => {
    return requisition.items.every(item => 
      item.approvalStatus !== "approved" || item.paymentStatus === "completed"
    );
  },
  storekeeper: (requisition) => {
    return requisition.items.every(item => 
      item.deliveryStatus === "Complete"
    );
  }
};
