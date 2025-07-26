export type RequisitionStatus = 'draft' | 'pending-procurement' | 'pending-treasury' | 'pending-ceo' | 'pending-payment' | 'pending-storekeeper' | 'completed' | 'rejected';
export type WorkflowStage = 'resident' | 'procurement' | 'treasury' | 'ceo' | 'payment' | 'storekeeper';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'partial' | 'Save for Later';
export type PaymentStatus = 'pending' | 'paid' | 'rejected' | 'completed';
export type DeliveryStatus = 'pending' | 'partial' | 'complete' | 'rejected';

export type DocumentType = 
  | 'supplier_quote'
  | 'purchase_order'
  | 'payment_receipt'
  | 'bank_statement'
  | 'delivery_note'
  | 'quality_certificate'
  | 'invoice'
  | 'other';

export const DOCUMENT_TYPES: Record<DocumentType, string> = {
  'supplier_quote': 'Supplier Quote',
  'purchase_order': 'Purchase Order',
  'payment_receipt': 'Payment Receipt',
  'bank_statement': 'Bank Statement',
  'delivery_note': 'Delivery Note',
  'quality_certificate': 'Quality Certificate',
  'invoice': 'Invoice',
  'other': 'Other Document'
};

export const STAGE_DOCUMENT_TYPES: Record<WorkflowStage, DocumentType[]> = {
  'resident': ['supplier_quote', 'other'],
  'procurement': ['supplier_quote', 'purchase_order', 'other'],
  'treasury': ['invoice', 'bank_statement', 'other'],
  'ceo': ['supplier_quote', 'purchase_order', 'invoice', 'other'],
  'payment': ['payment_receipt', 'bank_statement', 'invoice', 'other'],
  'storekeeper': ['delivery_note', 'quality_certificate', 'other']
};

export const WORKFLOW_STAGES: WorkflowStage[] = [
  'resident',
  'procurement',
  'treasury',
  'ceo',
  'payment',
  'storekeeper'
];

export interface DeliveryRecord {
  id: string;
  requisitionItemId: string;
  deliveryDate: string;
  quantity: number;
  qualityCheck: string;
  receivedBy: string;
  deliveryNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Document {
  id: string;
  requisitionId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  uploadedBy: UserRole;
  documentType: DocumentType;
  stage: WorkflowStage;
  url?: string;
  bucketId?: string;
  filePath?: string;
  // Add database-specific fields
  name: string;
  type: string;
  size: number;
}

export interface RequisitionItem {
  id: string;
  requisitionId: string;
  classification: string;
  description: string;
  amount: number;
  unit: string;
  supplier?: string;
  supplier_rfc?: string;
  priceUnit: number;
  multiplier: number;
  netPrice: number;
  subtotal: number;
  total: number;
  approvalStatus: ApprovalStatus;
  ceoItemComments?: string;
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  paymentAmount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  paymentNumber?: string;
  deliveryStatus: DeliveryStatus;
  deliveryDate?: string;
  quantityReceived?: number;
  qualityCheck?: string;
  deliveryNotes?: string;
  deliveryRecords: DeliveryRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Requisition {
  id: string;
  requisitionNumber: string;
  status: RequisitionStatus;
  createdDate: string;
  createdTime: string;
  lastModified: string;
  currentStage: WorkflowStage;
  projectId?: string;
  projectName: string;
  week?: string;

  // Stage completion flags
  residentComplete: boolean;
  procurementComplete: boolean;
  treasuryComplete: boolean;
  ceoComplete: boolean;
  paymentComplete: boolean;
  storekeeperComplete: boolean;

  // Comments for each stage
  residentComments?: string;
  procurementComments?: string;
  treasuryComments?: string;
  ceoComments?: string;
  paymentComments?: string;
  storekeeperComments?: string;

  items: RequisitionItem[];
  documents: Document[];
}

export type UserRole = WorkflowStage;

export const STATUS_LABELS: Record<RequisitionStatus, string> = {
  'draft': 'Draft',
  'pending-procurement': 'Pending Procurement',
  'pending-treasury': 'Pending Treasury',
  'pending-ceo': 'Pending CEO',
  'pending-payment': 'Pending Payment',
  'pending-storekeeper': 'Pending Storekeeper',
  'completed': 'Completed',
  'rejected': 'Rejected'
};

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  'resident': 'Resident',
  'procurement': 'Procurement',
  'treasury': 'Treasury',
  'ceo': 'CEO',
  'payment': 'Payment',
  'storekeeper': 'Storekeeper'
};
