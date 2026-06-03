import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadIcon, DownloadIcon, FileTextIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';
import { ASECustomerService } from '@/services/ase-customer.service';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { logger } from '@/lib/logger';
interface ASECustomerImportExportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function ASECustomerImportExportModal({
  open,
  onClose,
  onImportComplete
}: ASECustomerImportExportModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['.xlsx', '.xls', '.csv'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(fileExtension)) {
        toast.error('Invalid file type. Please select Excel (.xlsx, .xls) or CSV file.');
        return;
      }
      
      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to import');
      return;
    }

    try {
      setLoading(true);

      // Parse Excel client-side
      const buffer = await selectedFile.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        toast.error('No data found in file');
        return;
      }

      // Send ALL rows to backend — let backend handle empty fields and duplicates
      const customers = rows.map(row => ({
        phone: String(row['Phone*'] || row['phone'] || row['Phone'] || row['PHONE'] || row['Mobile'] || row['mobile'] || '').trim(),
        name: String(row['Name*'] || row['name'] || row['Name'] || row['NAME'] || '').trim() || null,
        company_name: String(row['Company Name'] || row['company_name'] || row['company'] || row['Company'] || '').trim() || null,
        email: String(row['Email'] || row['email'] || row['EMAIL'] || '').trim() || null,
        notes: String(row['Notes'] || row['notes'] || row['NOTES'] || '').trim() || null,
        services: String(row['Services'] || row['services'] || row['Service Interests'] || '').trim() || null,
        scheduled_date: String(row['Scheduled Date'] || row['scheduled_date'] || row['Follow Up'] || '').trim() || null,
        call_status: 'pending',
      }));

      toast.info(`Processing ${customers.length} rows...`);
      const results = await ASECustomerService.bulkImportCustomers(customers);
      
      setImportResults({
        success: true,
        total_processed: results.total_rows || rows.length,
        total_created: results.imported || 0,
        total_duplicates: results.duplicates || 0,
        total_skipped: results.skipped || 0,
        total_errors: (results.errors || []).length,
        errors: results.errors || [],
      });
      
      if (results.imported > 0) {
        toast.success(`Imported ${results.imported} customers${results.duplicates > 0 ? ` (${results.duplicates} duplicates skipped)` : ''}`);
        onImportComplete();
      } else if (results.duplicates > 0) {
        toast.warning(`No new customers imported. ${results.duplicates} numbers already exist.`);
      } else {
        toast.error('No customers could be imported. Check the errors below.');
      }
    } catch (error: any) {
      logger.error('Import error:', error);
      toast.error(error.message || 'Failed to import customers');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await ASECustomerService.getCustomers({ page_size: 500 });
      const customerList = response.results || [];

      const data = customerList.map((c: any) => ({
        ID: c.id,
        Name: c.name || '',
        Phone: c.phone,
        Email: c.email || '',
        'Call Status': c.call_status,
        'Custom Call Status': c.custom_call_status || '',
        Company: c.company_name_display || c.company_name || '',
        'Assigned To': c.assigned_to_name || '',
        Notes: c.notes || '',
        'Is Converted': c.is_converted ? 'Yes' : 'No',
        'Created At': new Date(c.created_at).toLocaleDateString(),
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ASE Customers');
      XLSX.writeFile(wb, `ase_customers_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Customers exported successfully');
    } catch (error: any) {
      logger.error('Export error:', error);
      toast.error('Failed to export customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      // Generate template with ALL call columns
      const templateData = [
        { 
          'Name*': 'Rahul Kumar', 
          'Phone*': '9876543210', 
          'Email': 'rahul@gmail.com',
          'Company Name': 'TechCorp',
          'Services': 'seo, social_media, web_design',
          'Notes': 'Interested in SEO package',
          'Scheduled Date': '2026-06-15',
        },
        { 
          'Name*': 'Priya Sharma', 
          'Phone*': '8765432109', 
          'Email': 'priya@outlook.com',
          'Company Name': 'DigiMark Solutions',
          'Services': 'content_marketing, ppc',
          'Notes': 'Follow up next week',
          'Scheduled Date': '2026-06-20',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, 'ase_calls_import_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (error: any) {
      logger.error('Template download error:', error);
      toast.error('Failed to download template');
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setImportResults(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetModal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="import-export-description">
        <DialogHeader>
          <DialogTitle>Import / Export ASE Customers</DialogTitle>
        </DialogHeader>

        <div id="import-export-description" className="sr-only">
          Import customers from Excel/CSV files or export existing customers to Excel format
        </div>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import Customers</TabsTrigger>
            <TabsTrigger value="export">Export Customers</TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Import Customers from Excel/CSV</h3>
                <p className="text-sm text-muted-foreground">
                  Upload an Excel (.xlsx, .xls) or CSV file with customer data. Customers will be automatically assigned to available employees.
                </p>
              </div>

              {/* Download Template */}
              <div className="p-4 border border-border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Download Import Template</h4>
                    <p className="text-sm text-muted-foreground">
                      Get the Excel template with required columns and sample data
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                  >
                    <FileTextIcon className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={!selectedFile || loading}
                className="w-full"
              >
                <UploadIcon className="w-4 h-4 mr-2" />
                {loading ? 'Importing...' : 'Import Customers'}
              </Button>

              {/* Import Results */}
              {importResults && (
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      <h4 className="font-medium">Import Results</h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-muted-foreground text-xs">Total Rows</p>
                        <p className="font-bold text-lg">{importResults.total_processed}</p>
                      </div>
                      <div className="p-2 rounded bg-green-50">
                        <p className="text-green-700 text-xs">Imported</p>
                        <p className="font-bold text-lg text-green-700">{importResults.total_created}</p>
                      </div>
                      <div className="p-2 rounded bg-orange-50">
                        <p className="text-orange-700 text-xs">Duplicates</p>
                        <p className="font-bold text-lg text-orange-700">{importResults.total_duplicates || 0}</p>
                      </div>
                      <div className="p-2 rounded bg-gray-50">
                        <p className="text-gray-600 text-xs">Skipped (empty)</p>
                        <p className="font-bold text-lg text-gray-600">{importResults.total_skipped || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Show duplicate errors with employee names */}
                  {importResults.errors && importResults.errors.length > 0 && (
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircleIcon className="w-5 h-5 text-red-500" />
                        <h4 className="font-medium text-red-700">Issues ({importResults.errors.length})</h4>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {importResults.errors.map((error: any, index: number) => (
                          <div key={index} className="text-sm flex items-start gap-2 py-1 border-b border-red-100 last:border-0">
                            <span className="text-xs text-red-400 font-mono shrink-0">Row {error.row}</span>
                            <span className="text-red-700">
                              {error.phone && <span className="font-medium">{error.phone}</span>}
                              {error.phone && ' — '}
                              {error.error}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show created customers */}
                  {importResults.created_customers && importResults.created_customers.length > 0 && (
                    <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                      <h4 className="font-medium text-green-700 mb-2">Successfully Created Customers</h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {importResults.created_customers.slice(0, 10).map((customer: any) => (
                          <div key={customer.id} className="text-sm">
                            <span className="font-medium">{customer.name}</span> - {customer.phone}
                            {customer.assigned_to && (
                              <span className="text-muted-foreground"> (assigned to {customer.assigned_to})</span>
                            )}
                          </div>
                        ))}
                        {importResults.created_customers.length > 10 && (
                          <p className="text-sm text-muted-foreground">
                            ... and {importResults.created_customers.length - 10} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Export Customers to Excel</h3>
                <p className="text-sm text-muted-foreground">
                  Download all ASE customers data in Excel format for backup or analysis.
                </p>
              </div>

              <div className="p-4 border border-border rounded-lg">
                <h4 className="font-medium mb-2">Export includes:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Customer ID, Name, Phone, Email</li>
                  <li>• Call Status and Custom Status</li>
                  <li>• Company and Assignment Information</li>
                  <li>• Notes and Conversion Status</li>
                  <li>• Creation Date and Creator</li>
                </ul>
              </div>

              <Button
                onClick={handleExport}
                disabled={loading}
                className="w-full"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                {loading ? 'Exporting...' : 'Export All Customers'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Close Button */}
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={resetModal}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}