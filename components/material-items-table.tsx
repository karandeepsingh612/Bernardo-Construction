"use client"

import { useState, useEffect } from "react"
import type { RequisitionItem, UserRole, DeliveryRecord, PaymentStatus, DeliveryStatus, WorkflowStage } from "@/types"
import { canUserEditField, canUserDeleteMaterial, getTotalQuantityReceived, getLatestDeliveryDate, getDeliveryStatus } from "@/lib/permissions"
import { supabase } from "@/lib/supabaseClient"
import { v4 as uuidv4 } from 'uuid'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Edit3, Save, X, Table as TableIcon, Grid3X3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table"


interface MaterialItemsTableProps {
  items: RequisitionItem[]
  onItemsChange: (items: RequisitionItem[]) => void
  userRole: UserRole | null
  requisitionId: string
  currentStage: WorkflowStage // Add this line
}

export function MaterialItemsTable({ items, onItemsChange, userRole, requisitionId, currentStage }: MaterialItemsTableProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<RequisitionItem | null>(null)
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null)
  const [deleteRecordConfirmOpen, setDeleteRecordConfirmOpen] = useState(false)
  const [descInput, setDescInput] = useState("")
  const [showDescSuggestions, setShowDescSuggestions] = useState(false)
  const [showClassSuggestions, setShowClassSuggestions] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  // Catalog state from Supabase
  const [catalogData, setCatalogData] = useState<any[]>([]);
  const [supplierData, setSupplierData] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCatalog() {
      setCatalogLoading(true);
      setCatalogError(null);
      const { data, error } = await supabase
        .from("catalog")
        .select("*")
        .order("classification", { ascending: true });
      if (error) {
        setCatalogError("Failed to load catalog");
        setCatalogData([]);
      } else {
        setCatalogData(data || []);
      }
      setCatalogLoading(false);
    }
    fetchCatalog();
  }, []);

  useEffect(() => {
    async function fetchSuppliers() {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name", { ascending: true });
      if (error) {
        console.error("Failed to load suppliers:", error);
        setSupplierData([]);
      } else {
        setSupplierData(data || []);
      }
    }
    fetchSuppliers();
  }, []);

  const filteredCatalog = (() => {
    if (!editingItem) return [];
    return catalogData.filter(item =>
      (!editingItem.classification || item.classification === editingItem.classification) &&
      (!descInput || item.description.toLowerCase().includes(descInput.toLowerCase()))
    );
  })();

  // Add useEffect to auto-fill unit and supplier when description matches a catalog item
  useEffect(() => {
    if (!editingItem) return;
    const match = catalogData.find(item =>
      item.description.toLowerCase() === descInput.trim().toLowerCase() &&
      (!editingItem.classification || item.classification === editingItem.classification)
    );
    if (match) {
      if (editingItem.unit !== match.unit) updateEditingItem("unit", match.unit);
      if (editingItem.supplier !== match.supplier) updateEditingItem("supplier", match.supplier);
    } else {
      if (editingItem.unit !== "") updateEditingItem("unit", "");
    }
  }, [descInput, editingItem?.classification, catalogData]);

  // Add useEffect to auto-calculate netPrice, subtotal, and total in real time
  useEffect(() => {
    if (!editingItem) return;
    const { priceUnit, multiplier, amount } = editingItem;
    let netPrice = 0, subtotal = 0, total = 0;
    if (priceUnit && multiplier && amount) {
      netPrice = Math.round(priceUnit * multiplier * 100) / 100;
      subtotal = Math.round(priceUnit * amount * 100) / 100; // Changed: Price per Unit × Amount
      total = Math.round(subtotal * multiplier * 100) / 100;
    }
    if (
      editingItem.netPrice !== netPrice ||
      editingItem.subtotal !== subtotal ||
      editingItem.total !== total
    ) {
      setEditingItem({
        ...editingItem,
        netPrice,
        subtotal,
        total,
      });
    }
  }, [editingItem?.priceUnit, editingItem?.multiplier, editingItem?.amount]);

  // Add useEffect to synchronize supplier name and RFC when modal opens
  useEffect(() => {
    if (!editingItem || !supplierData.length) return;
    
    // If we have supplier_rfc but no supplier name, find the supplier by RFC
    if (editingItem.supplier_rfc && !editingItem.supplier) {
      const supplier = supplierData.find(s => s.rfc === editingItem.supplier_rfc);
      if (supplier) {
        setEditingItem({
          ...editingItem,
          supplier: supplier.name
        });
      }
    }
    
    // If we have supplier name but no supplier_rfc, find the RFC by name
    if (editingItem.supplier && !editingItem.supplier_rfc) {
      const supplier = supplierData.find(s => s.name === editingItem.supplier);
      if (supplier) {
        setEditingItem({
          ...editingItem,
          supplier_rfc: supplier.rfc
        });
      }
    }
  }, [editingItem, supplierData]);

  // Add useEffect to ensure payment status is properly set when modal opens
  useEffect(() => {
    if (!editingItem) return;
    
    // Ensure payment status is properly initialized
    if (editingItem.paymentStatus === undefined || editingItem.paymentStatus === null) {
      setEditingItem({
        ...editingItem,
        paymentStatus: editingItem.paymentStatus || "pending"
      });
    }
  }, [editingItem]);

  // Function to generate a unique 5-digit payment number
  const generatePaymentNumber = () => {
    // Generate a random 5-digit number
    const randomNumber = Math.floor(10000 + Math.random() * 90000);
    return `PAY-${randomNumber}`;
  };

  // Helper function to ensure all fields have proper default values
  const normalizeItem = (item: RequisitionItem): RequisitionItem => ({
    id: item.id || "",
    requisitionId: item.requisitionId || "",
    classification: item.classification || "",
    description: item.description || "",
    amount: item.amount || 0,
    unit: item.unit || "",
    supplier: item.supplier || "",
    supplier_rfc: item.supplier_rfc || "",
    priceUnit: item.priceUnit || 0,
    multiplier: item.multiplier || 1.16,
    netPrice: Math.round((item.netPrice || 0) * 100) / 100,
    subtotal: Math.round((item.subtotal || 0) * 100) / 100,
    total: Math.round((item.total || 0) * 100) / 100,
    approvalStatus: item.approvalStatus || "pending",
    ceoItemComments: item.ceoItemComments || "",
    paymentStatus: item.paymentStatus || "pending",
    paymentDate: item.paymentDate || "",
    paymentAmount: item.paymentAmount || 0,
    paymentMethod: item.paymentMethod || "",
    paymentReference: item.paymentReference || "",
    paymentNumber: item.paymentNumber || "",
    deliveryDate: item.deliveryDate || "",
    quantityReceived: item.quantityReceived || 0,
    deliveryStatus: item.deliveryStatus || "pending",
    qualityCheck: item.qualityCheck || "",
    deliveryNotes: item.deliveryNotes || "",
    deliveryRecords: Array.isArray(item.deliveryRecords) ? item.deliveryRecords : [],
  })

  const addNewItem = () => {
    const newItem: RequisitionItem = {
      id: uuidv4(),
      requisitionId,
      classification: "",
      description: "",
      amount: 0,
      unit: "",
      supplier: "",
      supplier_rfc: "",
      priceUnit: 0,
      multiplier: 1.16,
      netPrice: 0,
      subtotal: 0,
      total: 0,
      approvalStatus: "pending",
      ceoItemComments: "",
      paymentStatus: "pending",
      paymentDate: "",
      paymentAmount: 0,
      paymentMethod: "",
      paymentReference: "",
      paymentNumber: "",
      deliveryStatus: "pending",
      deliveryDate: "",
      quantityReceived: 0,
      qualityCheck: "",
      deliveryNotes: "",
      deliveryRecords: [],
    };
    setEditingItemId(newItem.id);
    setEditingItem(newItem);
    setDescInput("");
    setShowClassSuggestions(false);
    setIsModalOpen(true);
  };

  const confirmDelete = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!canUserDeleteMaterial(userRole, currentStage, item?.approvalStatus)) {
      return;
    }
    setItemToDelete(itemId);
    setDeleteConfirmOpen(true);
  }

  const removeItem = () => {
    if (!itemToDelete) return

    onItemsChange(items.filter((item) => item.id !== itemToDelete))
    if (editingItemId === itemToDelete) {
      closeEditModal()
    }
    setDeleteConfirmOpen(false)
    setItemToDelete(null)
  }

  const cancelDelete = () => {
    setDeleteConfirmOpen(false)
    setItemToDelete(null)
  }

  const openEditModal = (item: RequisitionItem) => {
    const normalizedItem = normalizeItem(item)
    setEditingItemId(normalizedItem.id)
    setEditingItem(normalizedItem)
    setDescInput(normalizedItem.description || "")
    setIsModalOpen(true)
  }

  const closeEditModal = () => {
    setEditingItemId(null)
    setEditingItem(null)
    setIsModalOpen(false)
    setEditingRecordId(null)
  }

  const validateDeliveryRecords = (records: DeliveryRecord[]): boolean => {
    for (const record of records) {
      if (!record.deliveryDate) {
        alert("Delivery Date is required for all delivery records")
        return false
      }
      if (!record.quantity || record.quantity <= 0) {
        alert("Quantity Received must be greater than 0 for all delivery records")
        return false
      }
      if (!record.qualityCheck) {
        alert("Quality Check is required for all delivery records")
        return false
      }
      if (!record.receivedBy) {
        alert("Received By is required for all delivery records")
        return false
      }
    }
    return true
  }

  const saveEdit = () => {
    if (!editingItem) return

    console.log("Saving item with payment status:", editingItem.paymentStatus);

    // Use descInput for validation and saving
    if (!descInput.trim()) {
      alert("Description is required")
      return
    }
    if (!editingItem.unit.trim()) {
      alert("Unit is required")
      return
    }
    if (!editingItem.amount || editingItem.amount <= 0) {
      alert("Amount must be greater than 0")
      return
    }

    // Validate delivery records if they exist
    if (editingItem.deliveryRecords && editingItem.deliveryRecords.length > 0) {
      if (!validateDeliveryRecords(editingItem.deliveryRecords)) {
        return
      }
    }

    // Auto-calculate totals with new logic and round to 2 decimal places
    const updatedItem = { ...editingItem, description: descInput.trim() }
    if (updatedItem.priceUnit && updatedItem.multiplier && updatedItem.amount) {
      // Net Price = Price per unit × Multiplier
      updatedItem.netPrice = Math.round(updatedItem.priceUnit * updatedItem.multiplier * 100) / 100
      // Sub Total = Net Price × Amount
      updatedItem.subtotal = Math.round(updatedItem.netPrice * updatedItem.amount * 100) / 100
      // Total = Sub Total × Multiplier
      updatedItem.total = Math.round(updatedItem.subtotal * updatedItem.multiplier * 100) / 100
    }

    // --- Ensure deliveryStatus is in sync with delivery records ---
    const totalReceived = (updatedItem.deliveryRecords || []).reduce((sum, record) => sum + (record.quantity || 0), 0)
    if (totalReceived === 0) {
      updatedItem.deliveryStatus = "pending"
    } else if (totalReceived >= updatedItem.amount) {
      updatedItem.deliveryStatus = "Complete"
    } else {
      updatedItem.deliveryStatus = "partial"
    }
    // --- End deliveryStatus sync ---

    // Check if this is a new item (not in the current items list)
    const existingItemIndex = items.findIndex((item) => item.id === editingItem.id)

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = items.map((item) => (item.id === editingItem.id ? updatedItem : item))
      onItemsChange(updatedItems)
    } else {
      // Add new item
      onItemsChange([...items, updatedItem])
    }

    closeEditModal()
  }

  const updateEditingItem = (field: string, value: any) => {
    if (!editingItem) return
    setEditingItem({
      ...editingItem,
      [field]: value,
    })
  }

  // Direct update function for payment status to ensure proper state updates
  const updatePaymentStatus = (value: PaymentStatus) => {
    if (!editingItem) return
    console.log("Updating payment status to:", value);
    setEditingItem({
      ...editingItem,
      paymentStatus: value,
    })
  }

  const handlePaymentStatusChange = (newStatus: PaymentStatus) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      paymentStatus: newStatus,
    });
  };

  const handleDeliveryStatusChange = (newStatus: DeliveryStatus) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      deliveryStatus: newStatus,
    });
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "pending":
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const getDeliveryStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
      case "partial":
        return <Badge className="bg-blue-100 text-blue-800">Partial</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "pending":
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const canEditField = (field: string) => {
    return canUserEditField(userRole, field)
  }

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "partial":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const getDeliveryStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case "complete":
        return "bg-green-100 text-green-800"
      case "partial":
        return "bg-blue-100 text-blue-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const handleRowClick = (item: RequisitionItem, event: React.MouseEvent) => {
    // Don't open modal if clicking on action buttons
    if ((event.target as HTMLElement).closest("button")) {
      return
    }
    openEditModal(item)
  }

  // Sorting logic
  const sortedItems = (() => {
    if (!sortColumn) return items
    const sorted = [...items].sort((a, b) => {
      let aValue = a[sortColumn as keyof RequisitionItem]
      let bValue = b[sortColumn as keyof RequisitionItem]
      // For nested or computed fields
      if (sortColumn === 'qtyReceived') {
        aValue = getTotalQuantityReceived(a.deliveryRecords)
        bValue = getTotalQuantityReceived(b.deliveryRecords)
      }
      if (sortColumn === 'total') {
        aValue = a.total || 0
        bValue = b.total || 0
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      return 0
    })
    return sorted
  })();

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleDeliveryRecordAdd = (item: RequisitionItem) => {
    if (!editingItem) return;
    const newRecord: DeliveryRecord = {
      id: uuidv4(),
      requisitionItemId: item.id,
      deliveryDate: new Date().toISOString().split("T")[0],
      quantity: 0,
      qualityCheck: '',
      receivedBy: '',
    };
    const updatedRecords = [...(editingItem.deliveryRecords || []), newRecord];
    setEditingItem({
      ...editingItem,
      deliveryRecords: updatedRecords,
      deliveryStatus: getDeliveryStatus(updatedRecords, editingItem.amount),
    });
  };

  const handleDeliveryRecordChange = (recordId: string, field: keyof DeliveryRecord, value: any) => {
    if (!editingItem) return;
    const updatedRecords = editingItem.deliveryRecords.map(record =>
      record.id === recordId ? { ...record, [field]: value } : record
    );
    
    setEditingItem({
      ...editingItem,
      deliveryRecords: updatedRecords,
      deliveryStatus: getDeliveryStatus(updatedRecords, editingItem.amount),
    });
  };

  const getItemDeliveryStatus = (item: RequisitionItem): DeliveryStatus => {
    return getDeliveryStatus(item.deliveryRecords, item.amount);
  };

  const getItemTotalReceived = (item: RequisitionItem): number => {
    return getTotalQuantityReceived(item.deliveryRecords);
  };

  const getItemLatestDeliveryDate = (item: RequisitionItem): string => {
    return getLatestDeliveryDate(item.deliveryRecords) || '';
  };

  const canDeleteItem = (item: RequisitionItem) => {
    return canUserDeleteMaterial(userRole, currentStage, item.approvalStatus);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Material Items ({items.length})</h3>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="h-4 w-4 mr-2" />
              Table View
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("cards")}
            >
              <Grid3X3 className="h-4 w-4 mr-2" />
              Card View
            </Button>
          </div>
        </div>
        <Button onClick={addNewItem} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Material
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="text-gray-500">
              <h3 className="text-lg font-medium mb-2">No materials added yet</h3>
              <p className="mb-4">Click "Add Material" to get started</p>
              <Button onClick={addNewItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Material
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        // Table View
        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('index')}>
                        # {sortColumn === 'index' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('classification')}>
                        Classification {sortColumn === 'classification' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('supplier')}>
                        Supplier {sortColumn === 'supplier' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('description')}>
                        Description {sortColumn === 'description' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('amount')}>
                        Amount {sortColumn === 'amount' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('unit')}>
                        Unit {sortColumn === 'unit' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('priceUnit')}>
                        Price/Unit {sortColumn === 'priceUnit' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('total')}>
                        Total {sortColumn === 'total' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead className="cursor-pointer min-w-[150px] whitespace-nowrap" onClick={() => handleSort('approvalStatus')}>
                        CEO Approval Status {sortColumn === 'approvalStatus' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('paymentStatus')}>
                        Payment Status {sortColumn === 'paymentStatus' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead className="cursor-pointer min-w-[120px] whitespace-nowrap" onClick={() => handleSort('deliveryDate')}>
                        Delivery Date {sortColumn === 'deliveryDate' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('quantityReceived')}>
                        Qty Received {sortColumn === 'quantityReceived' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('deliveryStatus')}>
                        Delivery Status {sortColumn === 'deliveryStatus' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedItems.map((item, index) => (
                      <TableRow 
                        key={item.id} 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={(e) => handleRowClick(item, e)}
                      >
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.classification || '-'}</TableCell>
                        <TableCell>{item.supplier || '-'}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.amount}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.priceUnit ? `$${item.priceUnit.toFixed(2)}` : '-'}</TableCell>
                        <TableCell>{item.total ? `$${item.total.toFixed(2)}` : '-'}</TableCell>
                        <TableCell>
                          <Badge className={getApprovalStatusColor(item.approvalStatus)}>
                            {item.approvalStatus === "Save for Later" 
                              ? "Save for Later"
                              : item.approvalStatus.charAt(0).toUpperCase() + item.approvalStatus.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.paymentStatus && (
                            <Badge className={cn(
                              item.paymentStatus === "paid" && "bg-green-100 text-green-800",
                              item.paymentStatus === "completed" && "bg-green-100 text-green-800",
                              item.paymentStatus === "rejected" && "bg-red-100 text-red-800",
                              item.paymentStatus === "pending" && "bg-yellow-100 text-yellow-800"
                            )}>
                              {item.paymentStatus.charAt(0).toUpperCase() + item.paymentStatus.slice(1)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getItemLatestDeliveryDate(item) || '-'}
                        </TableCell>
                        <TableCell>
                          {getItemTotalReceived(item)} / {item.amount}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              getDeliveryStatus(item.deliveryRecords, item.amount) === "Complete" && "bg-green-100 text-green-800",
                              getDeliveryStatus(item.deliveryRecords, item.amount) === "partial" && "bg-blue-100 text-blue-800",
                              getDeliveryStatus(item.deliveryRecords, item.amount) === "rejected" && "bg-red-100 text-red-800",
                              getDeliveryStatus(item.deliveryRecords, item.amount) === "pending" && "bg-yellow-100 text-yellow-800"
                            )}
                          >
                            {getDeliveryStatus(item.deliveryRecords, item.amount) === "Complete"
                              ? "Completed"
                              : getDeliveryStatus(item.deliveryRecords, item.amount).charAt(0).toUpperCase() + getDeliveryStatus(item.deliveryRecords, item.amount).slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditModal(item); }}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            {canDeleteItem(item) && (
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); confirmDelete(item.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Card View
        <div className="space-y-4">
          {items.map((item, index) => (
            <Card key={item.id} className="transition-all">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">
                      Material #{index + 1}
                      {item.description && (
                        <span className="text-sm font-normal text-gray-600 ml-2">- {item.description}</span>
                      )}
                    </CardTitle>
                    {item.classification && (
                      <Badge variant="outline" className="mt-1">
                        {item.classification}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.approvalStatus && (
                      <Badge className={getApprovalStatusColor(item.approvalStatus)}>
                        {item.approvalStatus === "Save for Later"
                          ? "Save for Later"
                          : (item.approvalStatus || "pending").charAt(0).toUpperCase() +
                            (item.approvalStatus || "pending").slice(1)}
                      </Badge>
                    )}
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(item)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => confirmDelete(item.id)}
                        className={cn(
                          "text-red-600 hover:text-red-800",
                          !canDeleteItem(item) && "opacity-50 cursor-not-allowed",
                        )}
                        disabled={!canDeleteItem(item)}
                        title={
                          canDeleteItem(item)
                            ? "Delete"
                            : item.approvalStatus === "approved"
                            ? "Cannot delete CEO-approved items"
                            : "You don't have permission to delete this item"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-500">Amount:</span>
                    <p className="text-lg font-semibold">
                      {item.amount} {item.unit}
                    </p>
                  </div>
                  {item.supplier && (
                    <div>
                      <span className="font-medium text-gray-500">Supplier:</span>
                      <p>{item.supplier}</p>
                    </div>
                  )}
                  {item.priceUnit > 0 && (
                    <div>
                      <span className="font-medium text-gray-500">Price per Unit:</span>
                      <p>${item.priceUnit.toFixed(2)}</p>
                    </div>
                  )}
                  {item.total > 0 && (
                    <div>
                      <span className="font-medium text-gray-500">Total:</span>
                      <p className="text-lg font-semibold text-green-600">${item.total.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {(item.ceoItemComments || item.deliveryNotes) && (
                  <div className="space-y-2">
                    {item.ceoItemComments && (
                      <div>
                        <span className="font-medium text-gray-500 text-sm">CEO Comments:</span>
                        <p className="text-sm bg-gray-50 p-2 rounded">{item.ceoItemComments}</p>
                      </div>
                    )}
                    {item.deliveryNotes && (
                      <div>
                        <span className="font-medium text-gray-500 text-sm">Delivery Notes:</span>
                        <p className="text-sm bg-gray-50 p-2 rounded">{item.deliveryNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Material Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem?.description ? `Edit: ${editingItem.description}` : "Edit Material"}</DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-6 pt-0 pb-3">
              {/* Hidden dummy input to prevent auto-focus on classification */}
              <input className="sr-only" autoFocus tabIndex={-1} aria-hidden="true" />
              {/* Basic Information */}
              <div>
                <h4 className="font-medium text-sm text-blue-600 mb-3">BASIC INFORMATION</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="modal-classification">Classification</Label>
                    <Select
                      value={editingItem.classification}
                      onValueChange={(value) => {
                        console.log("Classification changed to:", value);
                        setEditingItem({
                          ...editingItem,
                          classification: value,
                          description: "",
                          unit: "",
                          supplier: "",
                          supplier_rfc: ""
                        });
                        setDescInput("");
                      }}
                      disabled={!canEditField("classification")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select classification" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(new Set(catalogData.map(item => item.classification)))
                          .filter(Boolean)
                          .sort()
                          .map((classification) => (
                            <SelectItem key={classification} value={classification}>
                              {classification}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="modal-description">Description</Label>
                    <Select
                      key={`desc-${editingItem.classification}`}
                      value={editingItem.description}
                      onValueChange={(value) => {
                        console.log("Description changed to:", value);
                        const selectedItem = catalogData.find(item => 
                          item.description === value && 
                          item.classification === editingItem.classification
                        );
                        
                        setEditingItem({
                          ...editingItem,
                          description: value,
                          unit: selectedItem?.unit || ""
                        });
                        setDescInput(value);
                      }}
                      disabled={!editingItem.classification || !canEditField("description")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select description" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogData
                          .filter(item => item.classification === editingItem.classification)
                          .map((item, index) => (
                            <SelectItem key={`${item.classification}-${item.description}-${index}`} value={item.description}>
                              {item.description}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="modal-amount">Amount *</Label>
                    <Input
                      id="modal-amount"
                      type="number"
                      value={editingItem.amount === 0 ? "" : editingItem.amount}
                      onChange={(e) => {
                        // Remove leading zeros
                        let val = e.target.value.replace(/^0+(?!$)/, "");
                        updateEditingItem("amount", Number.parseFloat(val) || 0);
                      }}
                      placeholder="0"
                      disabled={!canEditField("amount")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="modal-unit">Unit *</Label>
                    <Input
                      id="modal-unit"
                      value={editingItem.unit}
                      readOnly
                      placeholder="Unit"
                      className="bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Procurement Information */}
              <div>
                <h4 className="font-medium text-sm text-green-600 mb-3">PROCUREMENT INFORMATION</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="modal-supplier">Supplier Name</Label>
                    <Select
                      value={editingItem.supplier}
                      onValueChange={(value) => {
                        if (userRole !== 'resident') {
                          const selectedSupplier = supplierData.find(s => s.name === value);
                          setEditingItem({
                            ...editingItem,
                            supplier: value,
                            supplier_rfc: selectedSupplier?.rfc || ""
                          });
                        }
                      }}
                      disabled={userRole === 'resident' || !canEditField("supplier")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplierData.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.name}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="modal-supplier-rfc">Supplier RFC</Label>
                    <Select
                      value={editingItem.supplier_rfc}
                      onValueChange={(value) => {
                        if (userRole !== 'resident') {
                          const selectedSupplier = supplierData.find(s => s.rfc === value);
                          setEditingItem({
                            ...editingItem,
                            supplier_rfc: value,
                            supplier: selectedSupplier?.name || ""
                          });
                        }
                      }}
                      disabled={userRole === 'resident' || !canEditField("supplier")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select RFC" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplierData.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.rfc}>
                            {supplier.rfc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="modal-priceUnit">Price per Unit</Label>
                    <Input
                      id="modal-priceUnit"
                      type="number"
                      step="0.01"
                      value={editingItem.priceUnit === 0 ? "" : editingItem.priceUnit}
                      onChange={(e) => {
                        let val = e.target.value.replace(/^0+(?!$)/, "");
                        updateEditingItem("priceUnit", Number.parseFloat(val) || 0);
                      }}
                      placeholder="0.00"
                      disabled={!canEditField("priceUnit")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="modal-multiplier">Multiplier</Label>
                    <Input
                      id="modal-multiplier"
                      type="number"
                      step="0.01"
                      value={editingItem.multiplier === 0 ? "" : editingItem.multiplier}
                      onChange={(e) => {
                        let val = e.target.value.replace(/^0+(?!$)/, "");
                        updateEditingItem("multiplier", Number.parseFloat(val) || 1.16);
                      }}
                      placeholder="1.16"
                      disabled={!canEditField("multiplier")}
                    />
                    <p className="text-xs text-gray-500 mt-1">Default: 1.16 (includes markup/taxes)</p>
                  </div>
                  <div>
                    <Label htmlFor="modal-netPrice">Net Price</Label>
                    <Input
                      id="modal-netPrice"
                      type="number"
                      step="0.01"
                      value={editingItem.netPrice}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated: Price per Unit × Multiplier</p>
                  </div>
                  <div>
                    <Label htmlFor="modal-subtotal">Sub Total</Label>
                    <Input
                      id="modal-subtotal"
                      type="number"
                      step="0.01"
                      value={editingItem.subtotal}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated: Price per Unit × Amount</p>
                  </div>
                  <div>
                    <Label htmlFor="modal-total">Total</Label>
                    <Input
                      id="modal-total"
                      type="number"
                      step="0.01"
                      value={editingItem.total}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated: Sub Total × Multiplier</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* CEO Approval */}
              <div>
                <h4 className="font-medium text-sm text-purple-600 mb-3">CEO APPROVAL</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="modal-approvalStatus">Approval Status</Label>
                    <Select
                      value={editingItem.approvalStatus}
                      onValueChange={(value) => updateEditingItem("approvalStatus", value)}
                      disabled={!canEditField("approvalStatus")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="Save for Later">Save for Later</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="modal-ceoComments">CEO Comments</Label>
                    <Textarea
                      id="modal-ceoComments"
                      value={editingItem.ceoItemComments}
                      onChange={(e) => updateEditingItem("ceoItemComments", e.target.value)}
                      placeholder="CEO comments on this item..."
                      rows={2}
                      disabled={!canEditField("ceoItemComments")}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment Information */}
              <div>
                <h4 className="font-medium text-sm text-yellow-600 mb-3">PAYMENT INFORMATION</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="modal-paymentStatus">Payment Status</Label>
                    <Select
                      value={editingItem.paymentStatus}
                      onValueChange={(value) => {
                        // Auto-generate payment number when status is set to completed
                        if (value === "completed" && !editingItem.paymentNumber) {
                          setEditingItem({
                            ...editingItem,
                            paymentStatus: value,
                            paymentNumber: generatePaymentNumber()
                          });
                        } else {
                          updatePaymentStatus(value as PaymentStatus);
                        }
                      }}
                      disabled={!canEditField("paymentStatus")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="modal-paymentNumber">Payment Number</Label>
                    <Input
                      id="modal-paymentNumber"
                      value={editingItem.paymentNumber}
                      onChange={(e) => updateEditingItem("paymentNumber", e.target.value)}
                      placeholder="e.g., PAY-2024-001"
                      disabled={!canEditField("paymentNumber") || editingItem.paymentStatus === "completed"}
                      className={editingItem.paymentStatus === "completed" ? "bg-gray-100 text-gray-500" : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="modal-paymentDate">Payment Date</Label>
                    <Input
                      id="modal-paymentDate"
                      type="date"
                      value={editingItem.paymentDate}
                      onChange={(e) => updateEditingItem("paymentDate", e.target.value)}
                      disabled={!canEditField("paymentDate")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="modal-paymentAmount">Payment Amount</Label>
                    <Input
                      id="modal-paymentAmount"
                      type="number"
                      step="0.01"
                      value={editingItem.paymentAmount === 0 ? "" : editingItem.paymentAmount}
                      onChange={(e) => {
                        let val = e.target.value.replace(/^0+(?!$)/, "");
                        updateEditingItem("paymentAmount", Number.parseFloat(val) || 0);
                      }}
                      placeholder="0.00"
                      disabled={!canEditField("paymentAmount")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="modal-paymentMethod">Payment Method</Label>
                    <Select
                      value={editingItem.paymentMethod}
                      onValueChange={(value) => updateEditingItem("paymentMethod", value)}
                      disabled={!canEditField("paymentMethod")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="modal-paymentReference">Payment Reference</Label>
                    <Input
                      id="modal-paymentReference"
                      value={editingItem.paymentReference}
                      onChange={(e) => updateEditingItem("paymentReference", e.target.value)}
                      placeholder="e.g., TXN123456"
                      disabled={!canEditField("paymentReference")}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Delivery Information */}
              <div>
                <h4 className="font-medium text-sm text-orange-600 mb-3">DELIVERY INFORMATION</h4>

                {/* Delivery Summary */}
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-700">Total Ordered:</span>
                      <p className="text-lg font-semibold text-blue-900">
                        {editingItem.amount} {editingItem.unit}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Total Received:</span>
                      <p className="text-lg font-semibold text-blue-900">
                        {getItemTotalReceived(editingItem)} {editingItem.unit}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Status:</span>
                      <div className="mt-1">
                        <Badge
                          className={cn(
                            "text-sm font-semibold px-2 py-0",
                            getDeliveryStatus(editingItem.deliveryRecords, editingItem.amount) === "Complete" && "bg-green-100 text-green-800",
                            getDeliveryStatus(editingItem.deliveryRecords, editingItem.amount) === "partial" && "bg-yellow-100 text-yellow-800",
                            getDeliveryStatus(editingItem.deliveryRecords, editingItem.amount) === "pending" && "bg-gray-100 text-gray-800"
                          )}
                        >
                                                      {getDeliveryStatus(editingItem.deliveryRecords, editingItem.amount) === "Complete"
                            ? "Completed"
                            : getDeliveryStatus(editingItem.deliveryRecords, editingItem.amount).charAt(0).toUpperCase() +
                              getDeliveryStatus(editingItem.deliveryRecords, editingItem.amount).slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Records */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h5 className="font-medium text-sm">
                      Delivery Records ({editingItem.deliveryRecords?.length || 0})
                    </h5>
                    {canEditField("deliveryRecords") && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const today = new Date();
                          const yyyy = today.getFullYear();
                          const mm = String(today.getMonth() + 1).padStart(2, '0');
                          const dd = String(today.getDate()).padStart(2, '0');
                          const todayStr = `${yyyy}-${mm}-${dd}`;
                          
                          const newRecord: DeliveryRecord = {
                            id: uuidv4(),
                            requisitionItemId: editingItem.id,
                            deliveryDate: todayStr,
                            quantity: 0,
                            qualityCheck: "pending",
                            receivedBy: "",
                            deliveryNotes: "",
                          }
                          updateEditingItem("deliveryRecords", [newRecord, ...(editingItem.deliveryRecords || [])])
                          setEditingRecordId(newRecord.id)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Delivery
                      </Button>
                    )}
                  </div>

                  {editingItem.deliveryRecords && editingItem.deliveryRecords.length > 0 ? (
                    <div className="space-y-3">
                      {editingItem.deliveryRecords.map((record, displayIndex) => {
                        const isEditing = editingRecordId === record.id
                        // Calculate the actual delivery number based on total records and chronological order
                        const deliveryNumber = editingItem.deliveryRecords.length - displayIndex

                        return (
                          <Card key={record.id} className={cn("p-4", isEditing && "ring-2 ring-blue-500")}>
                            <div className="flex justify-between items-start mb-3">
                              <h6 className="font-medium text-sm">
                                Delivery #{deliveryNumber}
                                {displayIndex === 0 && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Latest
                                  </Badge>
                                )}
                              </h6>
                              <div className="flex gap-2">
                                {canEditField("deliveryRecords") && (
                                  <>
                                    {isEditing ? (
                                      <>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingRecordId(null)}
                                          className="text-gray-600 hover:text-gray-800"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            const updatedRecords = editingItem.deliveryRecords.filter(
                                              (r) => r.id !== record.id,
                                            )
                                            updateEditingItem("deliveryRecords", updatedRecords)
                                            setEditingRecordId(null)
                                          }}
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingRecordId(record.id)}
                                          className="text-blue-600 hover:text-blue-800"
                                        >
                                          <Edit3 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setDeleteRecordId(record.id)
                                            setDeleteRecordConfirmOpen(true)
                                          }}
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`delivery-date-${record.id}`} className="flex items-center gap-1">
                                  Delivery Date <span className="text-red-500">*</span>
                                </Label>
                                {isEditing ? (
                                  <Input
                                    id={`delivery-date-${record.id}`}
                                    type="date"
                                    value={record.deliveryDate}
                                    onChange={(e) => {
                                      const updatedRecords = editingItem.deliveryRecords.map((r) =>
                                        r.id === record.id ? { ...r, deliveryDate: e.target.value } : r,
                                      )
                                      updateEditingItem("deliveryRecords", updatedRecords)
                                    }}
                                    required
                                  />
                                ) : (
                                  <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
                                    {record.deliveryDate || "-"}
                                  </div>
                                )}
                              </div>
                              <div>
                                <Label htmlFor={`quantity-${record.id}`} className="flex items-center gap-1">
                                  Quantity Received <span className="text-red-500">*</span>
                                </Label>
                                {isEditing ? (
                                  <Input
                                    id={`quantity-${record.id}`}
                                    type="number"
                                    value={record.quantity === 0 ? "" : record.quantity}
                                    onChange={(e) => {
                                      let val = e.target.value.replace(/^0+(?!$)/, "");
                                      const newQuantity = Number.parseFloat(val) || 0;
                                      
                                      // Calculate total quantity received excluding current record
                                      const totalReceivedExcludingCurrent = editingItem.deliveryRecords
                                        .filter(r => r.id !== record.id)
                                        .reduce((sum, r) => sum + (r.quantity || 0), 0);
                                      
                                      // Check if new total would exceed ordered amount
                                      if (totalReceivedExcludingCurrent + newQuantity > editingItem.amount) {
                                        alert(`Total received quantity cannot exceed the ordered amount (${editingItem.amount} ${editingItem.unit})`);
                                        return;
                                      }

                                      const updatedRecords = editingItem.deliveryRecords.map((r) =>
                                        r.id === record.id
                                          ? { ...r, quantity: newQuantity }
                                          : r,
                                      );
                                      updateEditingItem("deliveryRecords", updatedRecords);
                                    }}
                                    placeholder="0"
                                    required
                                  />
                                ) : (
                                  <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
                                    {record.quantity || 0} {editingItem.unit}
                                  </div>
                                )}
                              </div>
                              <div>
                                <Label htmlFor={`quality-${record.id}`} className="flex items-center gap-1">
                                  Quality Check <span className="text-red-500">*</span>
                                </Label>
                                {isEditing ? (
                                  <Select
                                    value={record.qualityCheck}
                                    onValueChange={(value) => {
                                      const updatedRecords = editingItem.deliveryRecords.map((r) =>
                                        r.id === record.id ? { ...r, qualityCheck: value } : r,
                                      )
                                      updateEditingItem("deliveryRecords", updatedRecords)
                                    }}
                                    required
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select quality" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="passed">Passed</SelectItem>
                                      <SelectItem value="failed">Failed</SelectItem>
                                      <SelectItem value="partial">Partial</SelectItem>
                                      <SelectItem value="pending">Pending</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
                                    {record.qualityCheck ? (
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          record.qualityCheck === "passed" && "bg-green-100 text-green-800",
                                          record.qualityCheck === "failed" && "bg-red-100 text-red-800",
                                          record.qualityCheck === "partial" && "bg-yellow-100 text-yellow-800",
                                          record.qualityCheck === "pending" && "bg-gray-100 text-gray-800",
                                        )}
                                      >
                                        {record.qualityCheck.charAt(0).toUpperCase() + record.qualityCheck.slice(1)}
                                      </Badge>
                                    ) : (
                                      "-"
                                    )}
                                  </div>
                                )}
                              </div>
                              <div>
                                <Label htmlFor={`received-by-${record.id}`} className="flex items-center gap-1">
                                  Received By <span className="text-red-500">*</span>
                                </Label>
                                {isEditing ? (
                                  <Input
                                    id={`received-by-${record.id}`}
                                    value={record.receivedBy}
                                    onChange={(e) => {
                                      const updatedRecords = editingItem.deliveryRecords.map((r) =>
                                        r.id === record.id ? { ...r, receivedBy: e.target.value } : r,
                                      )
                                      updateEditingItem("deliveryRecords", updatedRecords)
                                    }}
                                    placeholder="Name of receiver"
                                    required
                                  />
                                ) : (
                                  <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
                                    {record.receivedBy || "-"}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-4">
                              <Label htmlFor={`notes-${record.id}`}>Delivery Notes (Optional)</Label>
                              {isEditing ? (
                                <Textarea
                                  id={`notes-${record.id}`}
                                  value={record.deliveryNotes || ""}
                                  onChange={(e) => {
                                    const updatedRecords = editingItem.deliveryRecords.map((r) =>
                                      r.id === record.id ? { ...r, deliveryNotes: e.target.value } : r,
                                    )
                                    updateEditingItem("deliveryRecords", updatedRecords)
                                  }}
                                  placeholder="Notes about this delivery..."
                                  rows={2}
                                />
                              ) : (
                                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm min-h-[60px]">
                                  {record.deliveryNotes || ""}
                                </div>
                              )}
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No delivery records yet</p>
                      {canEditField("deliveryRecords") && (
                        <p className="text-sm">Click "Add Delivery" to record the first delivery</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={!descInput.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Material Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this material record? This action cannot be undone.
            </p>
            {itemToDelete && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">
                  Material: {items.find((item) => item.id === itemToDelete)?.description || "Unknown"}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={removeItem}>
              Delete Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Delivery Record Confirmation Dialog */}
      <Dialog open={deleteRecordConfirmOpen} onOpenChange={setDeleteRecordConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this delivery record? This action cannot be undone.
            </p>
            {deleteRecordId && editingItem && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">
                  Delivery Record: {editingItem.deliveryRecords.find((r) => r.id === deleteRecordId)?.deliveryDate || "Unknown"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Quantity: {editingItem.deliveryRecords.find((r) => r.id === deleteRecordId)?.quantity || 0} {editingItem.unit}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteRecordId(null)
              setDeleteRecordConfirmOpen(false)
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
              if (!editingItem || !deleteRecordId) return
              const updatedRecords = editingItem.deliveryRecords.filter(
                (r) => r.id !== deleteRecordId
              )
              updateEditingItem("deliveryRecords", updatedRecords)
              setDeleteRecordId(null)
              setDeleteRecordConfirmOpen(false)
            }}>
              Delete Delivery Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {items.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Total Materials: {items.length}</span>
            <span className="font-medium">
              Total Value: ${items.reduce((sum, item) => sum + (item.approvalStatus === "approved" ? (item.total || 0) : 0), 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
