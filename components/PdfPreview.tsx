"use client"
import { Document, Page, pdfjs } from 'react-pdf';
import React, { useEffect, useState } from 'react';
import { AlertCircle, Download } from 'lucide-react';

export default function PdfPreview({ fileUrl }: { fileUrl: string }) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Configure PDF.js worker only on client side
    if (typeof window !== 'undefined') {
      try {
        console.log('Configuring PDF.js worker...');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
        console.log('PDF.js worker configured successfully');
      } catch (error) {
        console.error('Failed to configure PDF.js worker:', error);
        setHasError(true);
      }
    }
  }, []);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load PDF</h3>
        <p className="text-gray-600 mb-4">There was an error loading the PDF preview.</p>
        <a
          href={fileUrl}
          download
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </a>
      </div>
    );
  }

  return (
    <Document 
      file={fileUrl} 
      loading={
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading PDF...</span>
        </div>
      }
      error={
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading PDF</h3>
          <p className="text-gray-600 mb-4">Unable to display the PDF preview.</p>
          <a
            href={fileUrl}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
        </div>
      }
      onLoadSuccess={() => {
        console.log('PDF loaded successfully');
        setIsLoading(false);
      }}
      onLoadError={(error) => {
        console.error('PDF load error:', error);
        setHasError(true);
      }}
    >
      <Page pageNumber={1} width={400} />
    </Document>
  );
} 