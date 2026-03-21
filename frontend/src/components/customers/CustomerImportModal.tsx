import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import * as XLSX from 'xlsx';

import { logger } from '@/lib/logger';
interface ImportPreviewRow {
  row: number;
  phone: string;
  name: string;
  valid: boolean;
  error?: string;
}

interface ImportSummary {
  total_rows: number;
  success_count: number;
  duplicate_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    phone: string;
    error: string;
  }>;
}

interface CustomerImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function CustomerImportModal({ open, onClose, onImportComplete }: CustomerImportModalProps) {
  const [importType, setImportType] = useState<'csv' | 'excel' | 'clipboard'>('csv');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clipboardText, setClipboardText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<ImportPreviewRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setClipboardText('');
    setPreviewData([]);
    setShowPreview(false);
    setImportSummary(null);
    setShowResults(false);
    setUploadProgress(0);
    onClose();
  }, [onClose]);

  // File validation
  const validateFile = (file: File): boolean => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit');
      return false;
    }

    const validTypes = importType === 'csv' 
      ? ['text/csv', 'application/vnd.ms-excel']
      : ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error(`Invalid file format. Please upload a ${importType.toUpperCase()} file.`);
      return false;
    }

    return true;
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      handlePreview(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Parse CSV content
  const parseCSV = (content: string): Array<{ phone: string; name: string }> => {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return [];

    // Detect delimiter
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

    // Parse header
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const phoneIndex = headers.findIndex(h => h.includes('phone'));
    const nameIndex = headers.findIndex(h => h.includes('name'));

    if (phoneIndex === -1) {
      toast.error('CSV must contain a "phone" column');
      return [];
    }

    // Parse data rows
    const data: Array<{ phone: string; name: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(delimiter).map(v => v.trim().replace(/['"]/g, ''));
      const phone = values[phoneIndex] || '';
      const name = nameIndex !== -1 ? values[nameIndex] || '' : '';

      if (phone) {
        data.push({ phone, name });
      }
    }

    return data;
  };

  // Parse Excel content
  const parseExcel = (file: File): Promise<Array<{ phone: string; name: string }>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const parsedData: Array<{ phone: string; name: string }> = [];
          
          jsonData.forEach((row: any) => {
            const phone = String(row['phone'] || row['Phone'] || row['Phone Number'] || row['PHONE'] || '').trim();
            const name = String(row['name'] || row['Name'] || row['NAME'] || '').trim();
            
            if (phone) {
              parsedData.push({ phone, name });
            }
          });

          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Handle preview
  const handlePreview = async (file?: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(30);

      let parsedData: Array<{ phone: string; name: string }> = [];

      if (importType === 'clipboard') {
        if (!clipboardText.trim()) {
          toast.error('Please paste data in the text area');
          setIsUploading(false);
          return;
        }
        parsedData = parseCSV(clipboardText);
      } else if (file) {
        if (importType === 'csv') {
          const content = await file.text();
          parsedData = parseCSV(content);
        } else {
          parsedData = await parseExcel(file);
        }
      }

      setUploadProgress(60);

      // Validate and create preview
      const preview: ImportPreviewRow[] = parsedData.map((row, index) => {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
        const valid = phoneRegex.test(row.phone);
        const error = !valid ? 'Invalid phone format' : undefined;

        return {
          row: index + 1,
          phone: row.phone,
          name: row.name,
          valid,
          error,
        };
      });

      setUploadProgress(100);
      setPreviewData(preview);
      setShowPreview(true);
      
      const validCount = preview.filter(r => r.valid).length;
      const errorCount = preview.filter(r => !r.valid).length;
      
      toast.success(`Preview ready: ${validCount} valid, ${errorCount} invalid rows`);
    } catch (error) {
      logger.error('Preview error:', error);
      toast.error('Failed to preview data. Please check the file format.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle import submission
  const handleImport = async () => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      
      if (importType === 'clipboard') {
        // Create a CSV blob from clipboard text
        const blob = new Blob([clipboardText], { type: 'text/csv' });
        const file = new File([blob], 'clipboard.csv', { type: 'text/csv' });
        formData.append('file', file);
        formData.append('import_type', 'csv');
      } else if (selectedFile) {
        formData.append('file', selectedFile);
        formData.append('import_type', importType);
      }

      formData.append('handle_duplicates', 'skip');

      setUploadProgress(50);

      // Call the import API endpoint
      const response = await apiClient.importCustomers(formData);

      setUploadProgress(100);

      if (response.success) {
        setImportSummary(response.summary);
        setShowPreview(false);
        setShowResults(true);
        
        toast.success(`Import completed: ${response.summary.success_count} customers imported`);
        
        // Refresh customer list
        onImportComplete();
      } else {
        toast.error('Import failed. Please try again.');
      }
    } catch (error) {
      logger.error('Import error:', error);
      toast.error('Failed to import customers. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    const templateData = [
      { phone: '+1234567890', name: 'John Doe' },
      { phone: '+0987654321', name: 'Jane Smith' },
      { phone: '+1122334455', name: '' },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Template');
    
    ws['!cols'] = [{ wch: 15 }, { wch: 20 }];

    const fileName = importType === 'csv' ? 'customer_template.csv' : 'customer_template.xlsx';
    XLSX.writeFile(wb, fileName, { bookType: importType === 'csv' ? 'csv' : 'xlsx' });
    
    toast.success('Template downloaded successfully');
  };

  const validCount = previewData.filter(r => r.valid).length;
  const errorCount = previewData.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Customers</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file, or paste data from clipboard to import customers in bulk.
          </DialogDescription>
        </DialogHeader>

        {!showResults && (
          <div className="space-y-6">
            {/* Import Type Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Import Type</label>
              <Select value={importType} onValueChange={(value: any) => {
                setImportType(value);
                setSelectedFile(null);
                setClipboardText('');
                setPreviewData([]);
                setShowPreview(false);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV File</SelectItem>
                  <SelectItem value="excel">Excel File (.xlsx, .xls)</SelectItem>
                  <SelectItem value="clipboard">Paste from Clipboard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Upload Area */}
            {importType !== 'clipboard' && (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-2">
                  Drag and drop your {importType.toUpperCase()} file here
                </p>
                <p className="text-xs text-muted-foreground mb-4">or</p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={importType === 'csv' ? '.csv' : '.xlsx,.xls'}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Selected: {selectedFile.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  Maximum file size: 10MB
                </p>
              </div>
            )}

            {/* Clipboard Input */}
            {importType === 'clipboard' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Paste Data</label>
                <textarea
                  className="w-full h-40 p-3 border rounded-lg resize-none font-mono text-sm"
                  placeholder="Paste tab or comma separated data here...&#10;Example:&#10;phone,name&#10;+1234567890,John Doe&#10;+0987654321,Jane Smith"
                  value={clipboardText}
                  onChange={(e) => setClipboardText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Supports tab, comma, or semicolon separated values
                </p>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {/* Preview Table */}
            {showPreview && previewData.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Preview</h3>
                  <div className="flex gap-2">
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {validCount} Valid
                    </Badge>
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      {errorCount} Invalid
                    </Badge>
                  </div>
                </div>

                <div className="border rounded-lg max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(0, 100).map((row) => (
                        <TableRow
                          key={row.row}
                          className={!row.valid ? 'bg-red-50 dark:bg-red-950/20' : ''}
                        >
                          <TableCell>{row.row}</TableCell>
                          <TableCell className="font-mono text-sm">{row.phone}</TableCell>
                          <TableCell>{row.name || '-'}</TableCell>
                          <TableCell>
                            {row.valid ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Valid
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="w-3 h-3 mr-1" />
                                {row.error}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {previewData.length > 100 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Showing first 100 rows of {previewData.length}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                {!showPreview && (
                  <Button
                    onClick={() => {
                      if (importType === 'clipboard') {
                        handlePreview();
                      } else if (selectedFile) {
                        handlePreview(selectedFile);
                      } else {
                        toast.error('Please select a file or paste data');
                      }
                    }}
                    disabled={isUploading || (importType !== 'clipboard' && !selectedFile) || (importType === 'clipboard' && !clipboardText.trim())}
                  >
                    Preview
                  </Button>
                )}
                {showPreview && (
                  <Button
                    onClick={handleImport}
                    disabled={isUploading || validCount === 0}
                  >
                    Import {validCount} Customers
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Import Results */}
        {showResults && importSummary && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600" />
              <h3 className="text-2xl font-bold">Import Complete</h3>
              
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{importSummary.success_count}</p>
                  <p className="text-sm text-muted-foreground">Imported</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{importSummary.duplicate_count}</p>
                  <p className="text-sm text-muted-foreground">Duplicates</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{importSummary.error_count}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {importSummary.errors && importSummary.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Error Details
                </h4>
                <div className="border rounded-lg max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importSummary.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell className="font-mono text-sm">{error.phone}</TableCell>
                          <TableCell className="text-red-600">{error.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowResults(false);
                setImportSummary(null);
                setSelectedFile(null);
                setClipboardText('');
                setPreviewData([]);
                setShowPreview(false);
              }}>
                Import More
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
