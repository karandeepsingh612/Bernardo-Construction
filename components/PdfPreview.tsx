"use client"
import { Document, Page, pdfjs } from 'react-pdf';
import React from 'react';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PdfPreview({ fileUrl }: { fileUrl: string }) {
  return (
    <Document file={fileUrl} loading="Loading PDF...">
      <Page pageNumber={1} width={400} />
    </Document>
  );
} 