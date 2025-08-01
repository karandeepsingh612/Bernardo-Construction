import { supabase } from './supabaseClient';
import type { Database } from '../types/database';
import type { 
  Requisition, 
  RequisitionItem, 
  Document, 
  DeliveryRecord, 
  WorkflowStage,
  DocumentType 
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface DatabaseRequisition {
  id: string;
  requisition_number: string;
  status: string;
  current_stage: string;
  project_id?: string;
  project_name: string;
  week?: string;
  created_date: string;
  created_time: string;
  last_modified: string;
  resident_complete: boolean;
  procurement_complete: boolean;
  treasury_complete: boolean;
  ceo_complete: boolean;
  payment_complete: boolean;
  storekeeper_complete: boolean;
  resident_comments?: string;
  procurement_comments?: string;
  treasury_comments?: string;
  ceo_comments?: string;
  payment_comments?: string;
  storekeeper_comments?: string;
  created_by?: string;
}

interface DatabaseRequisitionItem {
  id: string;
  requisition_id: string;
  classification: string;
  description: string;
  amount: number;
  unit: string;
  supplier?: string;
  supplier_rfc?: string;
  price_unit: number;
  multiplier: number;
  net_price: number;
  subtotal: number;
  total: number;
  approval_status: string;
  ceo_item_comments?: string;
  payment_status: string;
  payment_date?: string;
  payment_amount?: number;
  payment_method?: string;
  payment_reference?: string;
  payment_number?: string;
  delivery_status: string;
  delivery_date?: string;
  quantity_received?: number;
  quality_check?: string;
  delivery_notes?: string;
  created_by?: string;
}

interface DatabaseDeliveryRecord {
  id: string;
  requisition_item_id: string;
  delivery_date: string;
  quantity: number;
  quality_check?: string;
  notes?: string;
  received_by?: string;
}

interface DatabaseDocument {
  id: string;
  requisition_id: string;
  name: string;
  file_path: string;
  bucket_id: string;
  type: string;
  size: number;
  uploaded_by?: string;
  stage?: string;
  url?: string;
  uploaded_at?: string;
}

export async function saveRequisition(requisition: Requisition, userName?: string) {
  try {
    // If no ID is provided, generate one
    if (!requisition.id) {
      requisition.id = uuidv4();
      
      // For new requisitions, set created date and time
      const now = new Date();
      requisition.createdDate = now.toISOString(); // Store full timestamp
      requisition.createdTime = now.toLocaleTimeString();
    }

    // First, save the main requisition
    const { data: reqData, error: reqError } = await supabase
      .from('requisitions')
      .upsert({
        id: requisition.id,
        requisition_number: requisition.requisitionNumber,
        status: requisition.status,
        current_stage: requisition.currentStage,
        project_id: requisition.projectId,
        project_name: requisition.projectName,
        week: requisition.week,
        created_date: requisition.createdDate, // This is now a full ISO timestamp
        created_time: requisition.createdTime,
        last_modified: new Date().toISOString(),
        resident_complete: requisition.residentComplete,
        procurement_complete: requisition.procurementComplete,
        treasury_complete: requisition.treasuryComplete,
        ceo_complete: requisition.ceoComplete,
        payment_complete: requisition.paymentComplete,
        storekeeper_complete: requisition.storekeeperComplete,
        resident_comments: requisition.residentComments,
        procurement_comments: requisition.procurementComments,
        treasury_comments: requisition.treasuryComments,
        ceo_comments: requisition.ceoComments,
        payment_comments: requisition.paymentComments,
        storekeeper_comments: requisition.storekeeperComments,
        created_by: userName || 'Unknown User',
      })
      .select()
      .single();

    if (reqError) {
      console.error('Error saving main requisition:', reqError);
      throw reqError;
    }

    // Then save all requisition items
    const { error: itemsError } = await supabase
      .from('requisition_items')
      .upsert(
        requisition.items.map(item => {
          // Include payment fields if status is 'paid' or 'completed'
          const paymentFields = (item.paymentStatus === 'paid' || item.paymentStatus === 'completed') ? {
            payment_date: item.paymentDate,
            payment_amount: item.paymentAmount,
            payment_method: item.paymentMethod,
            payment_reference: item.paymentReference,
            payment_number: item.paymentNumber,
          } : {
            payment_date: null,
            payment_amount: null,
            payment_method: null,
            payment_reference: null,
            payment_number: null,
          };

          return {
            id: item.id || uuidv4(),
            requisition_id: requisition.id,
            classification: item.classification,
            description: item.description,
            amount: item.amount,
            unit: item.unit,
            supplier: item.supplier || null,
            supplier_rfc: item.supplier_rfc || null,
            price_unit: item.priceUnit,
            multiplier: item.multiplier,
            net_price: item.netPrice,
            subtotal: item.subtotal,
            total: item.total,
            approval_status: item.approvalStatus,
            ceo_item_comments: item.ceoItemComments || null,
            payment_status: item.paymentStatus,
            ...paymentFields,
            delivery_status: item.deliveryStatus,
            delivery_date: item.deliveryDate || null,
            quantity_received: item.quantityReceived || null,
            quality_check: item.qualityCheck || null,
            delivery_notes: item.deliveryNotes || null,
            created_by: userName || 'Unknown User',
          };
        })
      );

    if (itemsError) {
      console.error('Error saving requisition items:', itemsError);
      throw itemsError;
    }

    // Save delivery records
    for (const item of requisition.items) {
      // Get existing delivery records for this item
      const { data: existingRecords, error: fetchError } = await supabase
        .from('delivery_records')
        .select('id')
        .eq('requisition_item_id', item.id);

      if (fetchError) {
        console.error('Error fetching existing delivery records:', fetchError);
        throw fetchError;
      }

      // Get IDs of records that should be kept
      const currentRecordIds = new Set(item.deliveryRecords?.map(r => r.id) || []);
      
      // Find records that should be deleted (exist in DB but not in current records)
      const recordsToDelete = existingRecords
        .filter(record => !currentRecordIds.has(record.id))
        .map(record => record.id);

      // Delete removed records
      if (recordsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('delivery_records')
          .delete()
          .in('id', recordsToDelete);

        if (deleteError) {
          console.error('Error deleting delivery records:', deleteError);
          throw deleteError;
        }
      }

      // Upsert current records
      if (item.deliveryRecords?.length) {
        const { error: deliveryError } = await supabase
          .from('delivery_records')
          .upsert(
            item.deliveryRecords.map(record => ({
              id: record.id || uuidv4(),
              requisition_item_id: item.id,
              delivery_date: new Date(record.deliveryDate).toISOString().split('T')[0],
              quantity: record.quantity,
              quality_check: record.qualityCheck,
              notes: record.deliveryNotes,
              received_by: record.receivedBy,
            }))
          );

        if (deliveryError) {
          console.error('Error saving delivery records:', deliveryError);
          throw deliveryError;
        }
      }
    }

    // Save documents
    if (requisition.documents?.length) {
      const { error: docsError } = await supabase
        .from('documents')
        .upsert(
          requisition.documents.map(doc => ({
            id: doc.id,
            requisition_id: requisition.id,
            name: doc.fileName,
            file_path: doc.filePath || '',
            bucket_id: doc.bucketId || 'documents',
            type: doc.documentType,
            size: doc.fileSize
          }))
        );

      if (docsError) {
        console.error('Error saving documents:', docsError);
        throw docsError;
      }
    }

    return reqData;
  } catch (error) {
    console.error('Error in saveRequisition:', error);
    throw error;
  }
}

export async function loadRequisitions(): Promise<Requisition[]> {
  console.log('loadRequisitions: Starting to load all requisitions')
  
  // First, get all requisitions
  const { data: requisitions, error: reqError } = await supabase
    .from('requisitions')
    .select('*') as { data: DatabaseRequisition[] | null, error: any };

  if (reqError) {
    console.error('loadRequisitions: Error loading requisitions:', reqError)
    throw reqError
  }
  
  if (!requisitions) {
    console.log('loadRequisitions: No requisitions found')
    return []
  }

  console.log('loadRequisitions: Found', requisitions.length, 'requisitions')

  // Transform database documents to frontend Document type
  const transformDocuments = (docs: DatabaseDocument[] | null, currentStage: WorkflowStage): Document[] => {
    if (!docs) return [];
    
    return docs.map(doc => {
      // Cast the database type to DocumentType
      const documentType = doc.type as DocumentType;
      
      return {
        id: doc.id,
        requisitionId: doc.requisition_id,
        fileName: doc.name,
        fileType: doc.type,
        documentType,
        fileSize: doc.size,
        uploadDate: doc.uploaded_at || new Date().toISOString(),
        uploadedBy: doc.uploaded_by || currentStage, // Use actual uploaded_by from database
        stage: doc.stage as WorkflowStage || currentStage,
        bucketId: doc.bucket_id,
        filePath: doc.file_path,
        url: doc.url || supabase.storage.from('documents').getPublicUrl(doc.file_path).data.publicUrl,
        // Add required database fields
        name: doc.name,
        type: doc.type,
        size: doc.size
      };
    });
  };

  // For each requisition, get its items, delivery records, and documents
  const fullRequisitions = await Promise.all(
    requisitions.map(async (req: DatabaseRequisition) => {
      // Get items
      const { data: items, error: itemsError } = await supabase
        .from('requisition_items')
        .select('*')
        .eq('requisition_id', req.id) as { data: DatabaseRequisitionItem[] | null, error: any };

      if (itemsError) throw itemsError;
      if (!items) return null;

      // Get delivery records for each item
      const itemsWithDeliveries = await Promise.all(
        items.map(async (item) => {
          const { data: deliveries, error: deliveryError } = await supabase
            .from('delivery_records')
            .select('*')
            .eq('requisition_item_id', item.id) as { data: DatabaseDeliveryRecord[] | null, error: any };

          if (deliveryError) throw deliveryError;

          return {
            ...item,
            deliveryRecords: deliveries || [],
          };
        })
      );

      // Get documents
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('requisition_id', req.id) as { data: DatabaseDocument[] | null, error: any };

      if (docsError) throw docsError;

      // Transform the data to match your frontend types
      return {
        id: req.id,
        requisitionNumber: req.requisition_number,
        status: req.status,
        currentStage: req.current_stage,
        projectId: req.project_id,
        projectName: req.project_name,
        week: req.week,
        createdDate: req.created_date,
        createdTime: req.created_time,
        lastModified: req.last_modified,
        residentComplete: req.resident_complete,
        procurementComplete: req.procurement_complete,
        treasuryComplete: req.treasury_complete,
        ceoComplete: req.ceo_complete,
        paymentComplete: req.payment_complete,
        storekeeperComplete: req.storekeeper_complete,
        residentComments: req.resident_comments,
        procurementComments: req.procurement_comments,
        treasuryComments: req.treasury_comments,
        ceoComments: req.ceo_comments,
        paymentComments: req.payment_comments,
        storekeeperComments: req.storekeeper_comments,
        createdBy: req.created_by,
        items: itemsWithDeliveries.map(item => ({
          id: item.id,
          requisitionId: item.requisition_id,
          classification: item.classification,
          description: item.description,
          amount: item.amount,
          unit: item.unit,
          supplier: item.supplier,
          supplier_rfc: item.supplier_rfc,
          priceUnit: item.price_unit,
          multiplier: item.multiplier,
          netPrice: item.net_price,
          subtotal: item.subtotal,
          total: item.total,
          approvalStatus: item.approval_status,
          ceoItemComments: item.ceo_item_comments,
          paymentStatus: item.payment_status,
          paymentDate: item.payment_date,
          paymentAmount: item.payment_amount,
          paymentMethod: item.payment_method,
          paymentReference: item.payment_reference,
          paymentNumber: item.payment_number,
          deliveryStatus: item.delivery_status,
          deliveryDate: item.delivery_date,
          quantityReceived: item.quantity_received,
          qualityCheck: item.quality_check,
          deliveryNotes: item.delivery_notes,
          createdBy: item.created_by,
          deliveryRecords: item.deliveryRecords.map(record => ({
            id: record.id,
            requisitionItemId: record.requisition_item_id,
            deliveryDate: record.delivery_date,
            quantity: record.quantity,
            qualityCheck: record.quality_check,
            receivedBy: record.received_by || '',
            deliveryNotes: record.notes,
          })),
        })),
        documents: transformDocuments(documents, req.current_stage as WorkflowStage)
      } as Requisition;
    })
  );

  const result = fullRequisitions.filter((req): req is Requisition => req !== null);
  console.log('loadRequisitions: Successfully loaded', result.length, 'requisitions with full data')
  return result;
}

export async function loadRequisition(id: string): Promise<Requisition | null> {
  try {
    console.log('Loading single requisition:', id)
    
    // Single query with joins - much faster than multiple queries
    const { data: req, error: reqError } = await supabase
      .from('requisitions')
      .select(`
        *,
        requisition_items (
          *,
          delivery_records (*)
        ),
        documents (*)
      `)
      .eq('id', id)
      .single();

    if (reqError) throw reqError;
    if (!req) return null;

    // Transform the data
    const itemsWithDeliveries = req.requisition_items?.map((item: any) => ({
      ...item,
      deliveryRecords: item.delivery_records || []
    })) || [];

    return {
      id: req.id,
      requisitionNumber: req.requisition_number,
      status: req.status,
      currentStage: req.current_stage,
      projectId: req.project_id,
      projectName: req.project_name,
      week: req.week,
      createdDate: req.created_date,
      createdTime: req.created_time,
      lastModified: req.last_modified,
      residentComplete: req.resident_complete,
      procurementComplete: req.procurement_complete,
      treasuryComplete: req.treasury_complete,
      ceoComplete: req.ceo_complete,
      paymentComplete: req.payment_complete,
      storekeeperComplete: req.storekeeper_complete,
      residentComments: req.resident_comments,
      procurementComments: req.procurement_comments,
      treasuryComments: req.treasury_comments,
      ceoComments: req.ceo_comments,
      paymentComments: req.payment_comments,
      storekeeperComments: req.storekeeper_comments,
      createdBy: req.created_by,
      items: itemsWithDeliveries.map((item: any) => ({
        id: item.id,
        requisitionId: item.requisition_id,
        classification: item.classification,
        description: item.description,
        amount: item.amount,
        unit: item.unit,
        supplier: item.supplier,
        supplier_rfc: item.supplier_rfc,
        priceUnit: item.price_unit,
        multiplier: item.multiplier,
        netPrice: item.net_price,
        subtotal: item.subtotal,
        total: item.total,
        approvalStatus: item.approval_status,
        ceoItemComments: item.ceo_item_comments,
        paymentStatus: item.payment_status,
        paymentDate: item.payment_date,
        paymentAmount: item.payment_amount,
        paymentMethod: item.payment_method,
        paymentReference: item.payment_reference,
        paymentNumber: item.payment_number,
        deliveryStatus: item.delivery_status,
        deliveryDate: item.delivery_date,
        quantityReceived: item.quantity_received,
        qualityCheck: item.quality_check,
        deliveryNotes: item.delivery_notes,
        createdBy: item.created_by,
        deliveryRecords: item.deliveryRecords.map((record: any) => ({
          id: record.id,
          requisitionItemId: record.requisition_item_id,
          deliveryDate: record.delivery_date,
          quantity: record.quantity,
          qualityCheck: record.quality_check,
          receivedBy: record.received_by || '',
          deliveryNotes: record.notes,
        })),
      })),
      documents: req.documents ? req.documents.map((doc: any) => ({
        id: doc.id,
        fileName: doc.name,
        filePath: doc.file_path,
        fileType: doc.type,
        fileSize: doc.size,
        uploadDate: doc.uploaded_at || new Date().toISOString(),
        documentType: doc.type as DocumentType,
        bucketId: doc.bucket_id,
        uploadedBy: doc.uploaded_by,
        stage: doc.stage,
        url: doc.url,
      })) : []
    } as Requisition;
  } catch (error) {
    console.error('Error loading requisition:', error)
    throw error
  }
}

export function generateRequisitionNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const timestamp = now.getTime();
  return `REQ-${year}-${month}-${day}-${timestamp.toString().slice(-3)}`;
}

// Helper function to get local date string (YYYY-MM-DD) without timezone conversion
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
} 