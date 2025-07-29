"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { UploadIcon, FileSpreadsheetIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";

export default function ExcelUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus('idle');
      setMessage("");
      
      // Preview the file content (first few rows)
      try {
        // For now, we'll just show the file is selected
        // In a real implementation, you'd use a library like xlsx to parse
        setMessage(`File selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`);
      } catch (error) {
        console.error("Error previewing file:", error);
      }
    }
  };

  const processExcelData = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');
    
    try {
      // In a real implementation, you would:
      // 1. Use a library like xlsx or exceljs to parse the Excel file
      // 2. Extract the relevant columns
      // 3. Map them to your database schema
      
      // For now, let's simulate the upload process
      const formData = new FormData();
      formData.append('file', file);
      
      // This would be an API route that processes the Excel file
      const response = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        setUploadStatus('success');
        setMessage(`Successfully uploaded ${result.projectsCount} projects!`);
        
        // Refresh the page after a delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadStatus('error');
      setMessage("Error uploading file. Please try again or check the file format.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadStatus('idle');
    setMessage("");
    // reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {!file ? (
        <div className="text-center">
          <FileSpreadsheetIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">select an excel file to upload project candidatures</p>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon size={16} />
              choose excel file
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileSpreadsheetIcon className="h-8 w-8 text-blue-500" />
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          
          {message && (
            <div className={`mb-4 p-3 rounded-md text-sm ${
              uploadStatus === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : uploadStatus === 'error'
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}>
              <div className="flex items-center gap-2 justify-center">
                {uploadStatus === 'success' && <CheckCircleIcon size={16} />}
                {uploadStatus === 'error' && <XCircleIcon size={16} />}
                {message}
              </div>
            </div>
          )}
          
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={processExcelData} 
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              <UploadIcon size={16} />
              {isUploading ? "processing..." : "upload & process"}
            </Button>
            <Button variant="outline" onClick={resetUpload} disabled={isUploading}>
              cancel
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            This will replace existing project data and update the voting projects.
          </p>
        </div>
      )}
    </div>
  );
} 