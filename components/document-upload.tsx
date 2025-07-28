"use client"

import React, { useState, useEffect, Suspense } from "react"
import type { Document, DocumentType, WorkflowStage, UserRole } from "@/types"
import { DOCUMENT_TYPES, STAGE_DOCUMENT_TYPES, STAGE_LABELS } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Upload, FileText, Download, Trash2, Eye, ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import { Document as PDFDocument, Page as PDFPage } from 'react-pdf';
import dynamic from 'next/dynamic';
import { supabase } from "@/lib/supabaseClient"
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/components/ui/use-toast"
import { pdfjs } from 'react-pdf';
import imageCompression from 'browser-image-compression';
import decode from 'heic-decode';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Move PdfPreview import inside the preview modal
const PdfPreview = dynamic(() => import('./PdfPreview'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
});

interface DocumentUploadProps {
  documents: Document[]
  onDocumentsChange: (documents: Document[]) => void
  userRole: UserRole
  currentStage: WorkflowStage
  requisitionId: string
}

export function DocumentUpload({
  documents,
  onDocumentsChange,
  userRole,
  currentStage,
  requisitionId,
}: DocumentUploadProps) {
  const { toast } = useToast()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | "">("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)
  const [viewDocumentOpen, setViewDocumentOpen] = useState(false)
  const [documentToView, setDocumentToView] = useState<Document | null>(null)
  const [expanded, setExpanded] = useState(documents.length > 0)
  const [editingDocumentName, setEditingDocumentName] = useState<string | null>(null)
  const [newDocumentName, setNewDocumentName] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // Only one preview state!
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'other'>('other');
  const [previewFilename, setPreviewFilename] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [heicPendingConversion, setHeicPendingConversion] = useState(false);

  // Reset documentToView when closing the modal
  useEffect(() => {
    if (!viewDocumentOpen) {
      setDocumentToView(null)
    }
  }, [viewDocumentOpen])

  // Add these state variables after the other useState declarations
  const [uploadProgress, setUploadProgress] = useState(0)

  // Get all available document types from all stages
  const allDocumentTypes = Object.values(STAGE_DOCUMENT_TYPES).flat()
  const uniqueDocumentTypes = [...new Set(allDocumentTypes)]

  // Separate state for file preview
  const [filePreview, setFilePreview] = useState<{ url: string; type: string } | null>(null)

  // When documents change, expand if there are any, collapse if none
  React.useEffect(() => {
    setExpanded(documents.length > 0)
  }, [documents.length])

  // Convert HEIC to JPEG
  const convertHeicToJpeg = async (file: File): Promise<File> => {
    // Check if it's a HEIC file
    const isHeic = file.type === 'image/heic' || 
                  file.type === 'image/heif' || 
                  file.name.toLowerCase().endsWith('.heic') ||
                  file.name.toLowerCase().endsWith('.heif');

    if (isHeic) {
      try {
        // Read the file as ArrayBuffer
        const buffer = await file.arrayBuffer();
        
        // Decode HEIC
        const { width, height, data } = await decode({
          buffer: buffer as ArrayBuffer
        });

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Get context
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        // Create ImageData
        const imageData = new ImageData(
          new Uint8ClampedArray(data.buffer),
          width,
          height
        );
        
        // Put image data on canvas
        ctx.putImageData(imageData, 0, 0);

        // Convert to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Failed to convert to blob'));
            },
            'image/jpeg',
            0.9
          );
        });

        // Create new file
        const convertedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
          type: 'image/jpeg',
          lastModified: file.lastModified,
        });

        return convertedFile;
      } catch (error) {
        console.error('HEIC conversion error:', error);
        throw new Error('Unable to process HEIC image. Please try again.');
      }
    }

    return file;
  };

  // Updated handleFileSelect for graceful HEIC fallback
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setHeicPendingConversion(false);
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("File size must be less than 10MB");
        event.target.value = '';
        return;
      }
      // HEIC/HEIF fallback logic
      if (
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        file.name.toLowerCase().endsWith('.heic') ||
        file.name.toLowerCase().endsWith('.heif')
      ) {
        // Try to preview (works only in Safari)
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setPreviewType('image');
        setPreviewFilename(file.name);
        setIsPreviewOpen(true);
        setSelectedFile(file);
        setHeicPendingConversion(false);
        // Test if the image loads
        const img = new window.Image();
        img.src = url;
        img.onload = () => {
          setUploadError(null);
        };
        img.onerror = () => {
          setUploadError(
            'Preview not available for HEIC images in this browser. The file will be converted after upload and will be viewable by all users.'
          );
          setPreviewUrl(null);
          setHeicPendingConversion(true);
        };
        return;
      }

      setIsUploading(true);
      
      // Process the file
      const processedFile = await convertHeicToJpeg(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(processedFile);
      setPreviewUrl(previewUrl);
      
      setSelectedFile(processedFile);
      setIsUploading(false);

      // Cleanup preview URL when component unmounts
      return () => URL.revokeObjectURL(previewUrl);
    }
  };

  // Update preview URL when document changes
  useEffect(() => {
    if (documentToView?.url) {
      setPreviewUrl(documentToView.url);
    } else {
      setPreviewUrl(null);
    }
  }, [documentToView]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const isImageFile = (fileType: string) => {
    const imageTypes = [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp', 
      'image/svg+xml',
      'image/heic',
      'image/heif'
    ];
    return imageTypes.some(type => fileType.toLowerCase().includes(type.toLowerCase())) ||
           fileType.toLowerCase().includes('image') ||
           /\.(jpg|jpeg|png|gif|webp|svg|heic|heif)$/i.test(fileType);
  }

  const isPdfFile = (fileType: string) => {
    return fileType.toLowerCase().includes('pdf') || 
           fileType.toLowerCase().includes('application/pdf');
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedDocumentType) {
      setUploadError("Please select a file and document type")
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      // Generate a UUID for the document
      const documentId = uuidv4()
      
      // Get proper file type
      const fileType = selectedFile.type || 
        (selectedFile.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/) ? 'image' : 'application/octet-stream')

      // Simple file name with original extension
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${documentId}.${fileExt}`

      // 1. Try storage upload first
      console.log('Attempting storage upload...')
      const { data: storageData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile, {
          upsert: false,
          contentType: selectedFile.type
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      console.log('Storage upload successful:', storageData)

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      console.log('Got public URL:', publicUrl)

      // Create document object that matches both UI and database needs
    const newDocument: Document = {
        id: documentId,
        requisitionId: requisitionId,
      fileName: selectedFile.name,
        fileType: fileType,
      fileSize: selectedFile.size,
      uploadDate: new Date().toISOString(),
      uploadedBy: userRole,
      documentType: selectedDocumentType,
      stage: currentStage,
        url: publicUrl,
        bucketId: 'documents',
        filePath: fileName,
        // These fields are required by the database
        name: selectedFile.name,
        type: selectedDocumentType,
        size: selectedFile.size
      }

      // Update UI
    onDocumentsChange([...documents, newDocument])

    // Reset form
    setSelectedFile(null)
    setSelectedDocumentType("")
    setIsUploadModalOpen(false)

    // Reset file input
    const fileInput = document.getElementById("file-upload") as HTMLInputElement
    if (fileInput) fileInput.value = ""

    } catch (error) {
      console.error("Upload error:", error)
      setUploadError(error instanceof Error ? error.message : "Failed to upload file")
    } finally {
      setIsUploading(false)
    }
  }

  const confirmDelete = (documentId: string) => {
    setDocumentToDelete(documentId)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!documentToDelete) return

    try {
      // Find the document to delete
      const docToDelete = documents.find(doc => doc.id === documentToDelete)
      if (!docToDelete) return

      // First delete from storage if there's a file path
      if (docToDelete.filePath) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([docToDelete.filePath])

        if (storageError) {
          throw new Error(`Failed to delete file: ${storageError.message}`)
        }
      }

      // Then delete from the database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentToDelete)

      if (dbError) {
        throw new Error(`Failed to delete document record: ${dbError.message}`)
      }

      // Update UI
      const updatedDocuments = documents.filter((doc) => doc.id !== documentToDelete)
      onDocumentsChange(updatedDocuments)

      toast({
        title: "Success",
        description: "Document deleted successfully",
      })
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive"
      })
    } finally {
    setDeleteConfirmOpen(false)
    setDocumentToDelete(null)
    }
  }

  const handleViewDocument = (document: Document) => {
    setDocumentToView(document);
    setViewDocumentOpen(true);
    if (document.url) {
      setPreviewUrl(document.url);
  }
  };

  const getDocumentIcon = (fileType: string | undefined) => {
    if (!fileType) return "📎" // Default icon for unknown file types
    
    const type = fileType.toLowerCase()
    if (type.includes("pdf")) return "📄"
    if (type.includes("image")) return "🖼️"
    if (type.includes("word") || type.includes("document")) return "📝"
    if (type.includes("excel") || type.includes("spreadsheet")) return "📊"
    return "📎"
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getDocumentTypeColor = (type: DocumentType) => {
    switch (type) {
      case "supplier_quote":
      case "purchase_order":
        return "bg-green-100 text-green-800"
      case "payment_receipt":
      case "bank_statement":
        return "bg-blue-100 text-blue-800"
      case "delivery_note":
      case "quality_certificate":
        return "bg-orange-100 text-orange-800"
      case "invoice":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStageColor = (stage: WorkflowStage) => {
    switch (stage) {
      case "resident":
        return "bg-blue-100 text-blue-800"
      case "procurement":
        return "bg-green-100 text-green-800"
      case "treasury":
        return "bg-purple-100 text-purple-800"
      case "ceo":
        return "bg-orange-100 text-orange-800"
      case "payment":
        return "bg-yellow-100 text-yellow-800"
      case "storekeeper":
        return "bg-pink-100 text-pink-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleEditDocumentName = async (document: Document) => {
    setEditingDocumentName(document.id)
    setNewDocumentName(document.fileName)
  }

  const saveDocumentName = async (documentId: string) => {
    if (!newDocumentName.trim()) {
      return
    }

    try {
      // Find the document to update
      const documentToUpdate = documents.find(doc => doc.id === documentId)
      if (!documentToUpdate) return

      // Create updated document object
      const updatedDocument = {
        ...documentToUpdate,
        fileName: newDocumentName.trim(),
        name: newDocumentName.trim() // Update both fileName and name
      }

      // Update the document in the database
      const { error: dbError } = await supabase
        .from('documents')
        .update({
          name: newDocumentName.trim()
        })
        .eq('id', documentId)

      if (dbError) {
        throw new Error(dbError.message)
      }

      // Update the UI
      const updatedDocuments = documents.map(doc =>
        doc.id === documentId ? updatedDocument : doc
      )
    onDocumentsChange(updatedDocuments)

      // Reset editing state
    setEditingDocumentName(null)
      setNewDocumentName("")
    } catch (error) {
      console.error("Failed to update document name:", error)
      toast({
        title: "Error",
        description: "Failed to update document name",
        variant: "destructive"
      })
    }
  }

  // Helper: determine file type for preview
  const getPreviewType = (fileType: string, fileName: string) => {
    if (fileType?.toLowerCase().includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) return 'pdf';
    if (fileType?.toLowerCase().startsWith('image') || /\.(jpg|jpeg|png|gif|webp|svg|heic|heif)$/i.test(fileName)) return 'image';
    return 'other';
  };

  // Open preview modal
  const handlePreview = (doc: Document) => {
    setPreviewDoc(doc);
    setPreviewFilename(doc.fileName);
    const type = getPreviewType(doc.fileType, doc.fileName);
    setPreviewType(type);
    setPreviewUrl(doc.url || null);
    setIsPreviewOpen(true);
    setHeicPendingConversion(false);
  };

  // For local files (not yet uploaded)
  const handleLocalPreview = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPreviewType(getPreviewType(file.type, file.name));
    setPreviewFilename(file.name);
    setIsPreviewOpen(true);
    setHeicPendingConversion(false);
  };

  // Clean up blob URLs on modal close
  useEffect(() => {
    if (!isPreviewOpen && previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [isPreviewOpen]);

  // Robust download handler
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({documents.length})
          <span className="ml-auto">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
          {expanded && documents.length > 0 && (
            <Button onClick={e => { e.stopPropagation(); setIsUploadModalOpen(true); }} size="sm" className="ml-2">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
          )}
        </CardTitle>
      </CardHeader>
      {expanded && (
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No documents uploaded yet</h3>
            <p className="mb-4">Upload quotes, receipts, and other relevant documents</p>
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload First Document
            </Button>
          </div>
        ) : (
          // Table View
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Document
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Type
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Stage
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Size
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Uploaded By
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Upload Date
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getDocumentIcon(document.fileType)}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{document.fileName}</p>
                          <p className="text-xs text-gray-500">{document.fileType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                        <div className="mt-1">
                      <Badge className={getDocumentTypeColor(document.documentType)}>
                        {DOCUMENT_TYPES[document.documentType]}
                      </Badge>
                        </div>
                    </td>
                    <td className="px-3 py-3">
                        <div className="mt-1">
                      <Badge variant="outline" className={getStageColor(document.stage)}>
                        {STAGE_LABELS[document.stage]}
                      </Badge>
                        </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm text-gray-900">{formatFileSize(document.fileSize)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm text-gray-900 capitalize">{document.uploadedBy}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm text-gray-900">
                        {new Date(document.uploadDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePreview(document)}
                          title="View Document"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(document.url || '', document.fileName)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => confirmDelete(document.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      )}

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="document-type">Document Type *</Label>
              <Select
                value={selectedDocumentType}
                onValueChange={(value) => setSelectedDocumentType(value as DocumentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDocumentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DOCUMENT_TYPES[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="file-upload">Select File *</Label>
              <div className="relative mt-1">
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="w-full justify-center"
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                  {selectedFile && (
                    <div className="p-2 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600 break-all">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  )}
                </div>
              <Input
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif"
                  className="hidden"
                  disabled={isUploading}
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-md">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-sm text-gray-500">Processing image...</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: PDF, Word, Excel, Images (including iPhone HEIC photos). Max size: 10MB
              </p>
            </div>

            {uploadError && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">{uploadError}</p>
              </div>
            )}

            {selectedFile && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getDocumentIcon(selectedFile.type)}</span>
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Current Stage:</strong> {STAGE_LABELS[currentStage]}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This document will be associated with the current workflow stage.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)} disabled={isUploading} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || !selectedDocumentType || isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
              <Upload className="h-4 w-4 mr-2" />
              Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Modal */}
      <Dialog open={viewDocumentOpen} onOpenChange={(open) => {
        setViewDocumentOpen(open);
        if (!open) {
          setDocumentToView(null);
          setPreviewUrl(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{documentToView && getDocumentIcon(documentToView.fileType)}</span>
              {documentToView?.fileName}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {documentToView && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="document-name">Document Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="document-name"
                      value={editingDocumentName === documentToView.id ? newDocumentName : documentToView.fileName}
                      onChange={(e) => setNewDocumentName(e.target.value)}
                      disabled={editingDocumentName !== documentToView.id}
                    />
                    {editingDocumentName === documentToView.id ? (
                      <Button onClick={() => saveDocumentName(documentToView.id)}>Save</Button>
                    ) : (
                      <Button variant="outline" onClick={() => handleEditDocumentName(documentToView)}>
                        Edit Name
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-700">Document Type:</span>
                    <div className="mt-1">
                      <Badge className={getDocumentTypeColor(documentToView.documentType)}>
                        {DOCUMENT_TYPES[documentToView.documentType]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Stage:</span>
                    <div className="mt-1">
                      <Badge variant="outline" className={getStageColor(documentToView.stage)}>
                        {STAGE_LABELS[documentToView.stage]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">File Size:</span>
                    <div className="mt-1">{formatFileSize(documentToView.fileSize)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">File Type:</span>
                    <div className="mt-1">{documentToView.fileType}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Uploaded By:</span>
                    <div className="mt-1 capitalize">{documentToView.uploadedBy}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Upload Date:</span>
                    <div className="mt-1">{new Date(documentToView.uploadDate).toLocaleString()}</div>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="flex flex-col items-center justify-center">
                    {isPdfFile(documentToView.fileType) ? (
                      <div className="w-full max-w-2xl mx-auto">
                        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin mx-auto" />}>
                          <div style={{ height: '60vh' }}>
                            <PdfPreview 
                              key={`${documentToView.id}-${Date.now()}`}
                              fileUrl={documentToView.url || ''}
                            />
                          </div>
                        </Suspense>
                        </div>
                    ) : isImageFile(documentToView.fileType) ? (
                      <div className="relative w-full max-h-[60vh] overflow-hidden flex items-center justify-center">
                        <img
                          key={`${documentToView.id}-${Date.now()}`}
                          src={previewUrl || documentToView.url}
                          alt={documentToView.fileName}
                          className="max-w-full max-h-[60vh] object-contain"
                          loading="lazy"
                          onError={(e) => {
                            console.error('Image load error:', e);
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = '/placeholder.svg';
                          }}
                        />
                    </div>
                  ) : (
                    <div>
                        <div className="text-6xl mb-4">{getDocumentIcon(documentToView.fileType)}</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Document Preview</h3>
                  <p className="text-gray-600 mb-4">
                          Preview not available for this file type.
                  </p>
                    </div>
                  )}
                  </div>
                  <div className="mt-4 flex justify-center">
                    <Button onClick={() => documentToView && handleDownload(documentToView.url || '', documentToView.fileName)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Document
                  </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDocumentOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            {documentToDelete && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">
                  Document: {documents.find((doc) => doc.id === documentToDelete)?.fileName || "Unknown"}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{previewType === 'image' ? '🖼️' : previewType === 'pdf' ? '📄' : '📎'}</span>
              {previewFilename}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {previewType === 'image' && previewUrl && !heicPendingConversion && (
              <div className="flex justify-center">
                <img src={previewUrl} alt={previewFilename} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
              </div>
            )}
            {previewType === 'image' && heicPendingConversion && (
              <div className="flex flex-col items-center justify-center">
                <div className="text-6xl mb-4">📎</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">HEIC Image</h3>
                <p className="text-gray-600 mb-4">Preview not available for this file type in this browser.<br />The file will be converted after upload and will be viewable by all users.</p>
              </div>
            )}
            {previewType === 'pdf' && previewUrl && (
              <iframe src={previewUrl} style={{ width: '100%', height: '70vh', border: 'none' }} title="PDF Preview" />
            )}
            {previewType === 'other' && (
              <div className="flex flex-col items-center justify-center">
                <div className="text-6xl mb-4">📎</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Document Preview</h3>
                <p className="text-gray-600 mb-4">Preview not available for this file type.</p>
              </div>
            )}
            <div className="mt-4 flex justify-center">
              {previewUrl && !heicPendingConversion && (
                <Button onClick={() => handleDownload(previewUrl, previewFilename)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Document
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
