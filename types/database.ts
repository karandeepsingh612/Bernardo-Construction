export type RequisitionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type RequisitionStage = 'RESIDENT' | 'PROCUREMENT' | 'TREASURY' | 'CEO' | 'PAYMENT' | 'STOREKEEPER';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'partial' | 'Save for Later';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REJECTED';
export type DeliveryStatus = 'PENDING' | 'PARTIAL' | 'COMPLETE' | 'REJECTED';

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'resident' | 'procurement' | 'treasury' | 'ceo' | 'storekeeper';
          can_manage_users: boolean | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Tables['user_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables['user_profiles']['Row']>;
      };
      catalog: {
        Row: {
          id: string;
          classification: string;
          description: string;
          unit: string;
          created_by: string;
          created_at?: string;
        };
        Insert: Omit<Tables['catalog']['Row'], 'id'>;
        Update: Partial<Tables['catalog']['Row']>;
      };
      delivery_records: {
        Row: {
          id: string;
          requisition_item_id: string;
          delivery_date: Date;
          quantity: number;
          quality_check?: string;
          notes?: string;
          received_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Insert: Omit<Tables['delivery_records']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables['delivery_records']['Row']>;
      };
      documents: {
        Row: {
          id: string;
          requisition_id?: string;
          name: string;
          file_path: string;
          bucket_id: string;
          type: string;
          size: number;
          uploaded_at?: string;
        };
        Insert: Omit<Tables['documents']['Row'], 'id' | 'uploaded_at'>;
        Update: Partial<Tables['documents']['Row']>;
      };
      requisition_items: {
        Row: {
          id: string;
          requisition_id: string;
          classification: string;
          description: string;
          amount: number;
          unit: string;
          supplier?: string;
          supplier_rfc?: string;
          price_unit?: number;
          multiplier: number;
          net_price?: number;
          subtotal?: number;
          total?: number;
          approval_status: ApprovalStatus;
          ceo_item_comments?: string;
          payment_status?: PaymentStatus;
          payment_date?: string;
          payment_amount?: number;
          payment_method?: string;
          payment_reference?: string;
          payment_number?: string;
          delivery_status?: DeliveryStatus;
          delivery_date?: string;
          quantity_received?: number;
          quality_check?: string;
          delivery_notes?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
        Insert: Omit<Tables['requisition_items']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables['requisition_items']['Row']>;
      };
      requisitions: {
        Row: {
          id: string;
          requisition_number: string;
          status: RequisitionStatus;
          current_stage: RequisitionStage;
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
        };
        Insert: Omit<Tables['requisitions']['Row'], 'id'>;
        Update: Partial<Tables['requisitions']['Row']>;
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          rfc: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Insert: Omit<Tables['suppliers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables['suppliers']['Row']>;
      };
    };
  };
};

type Tables = Database['public']['Tables']; 