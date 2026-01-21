import { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Customer, CallStatus, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerExcelImportExportProps {
  customers: Customer[];
  onImport: (customers: Partial<Customer>[]) => void;
  employees?: User[]; // For assignment
  canAssignToEmployee?: boolean;
}

export default function CustomerExcelImportExport({ 
  customers, 
  onImport, 
  employees = [],
  canAssignToEmployee = false 
}: CustomerExcelImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const exportData = customers.map(customer => ({
        'Phone Number': customer.phone,
        'Name': customer.name || '',
        'Call Status': customer.callStatus,
        'Custom Status': customer.customCallStatus || '',
        'Assigned To': customer.assignedToName || '',
        'Scheduled Date': customer.scheduledDate ? customer.scheduledDate.toISOString().split('T')[0] : '',
        'Notes': customer.notes || '',
        'Created Date': customer.createdAt.toISOString().split('T')[0],
        'Created By': customer.createdByName,
        'Is Converted': customer.isConverted ? 'Yes' : 'No',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');
      
      // Auto-size columns
      const colWidths = [
        { wch: 15 }, // Phone Number
        { wch: 20 }, // Name
        { wch: 15 }, // Call Status
        { wch: 15 }, // Custom Status
        { wch: 15 }, // Assigned To
        { wch: 12 }, // Scheduled Date
        { wch: 30 }, // Notes
        { wch: 12 }, // Created Date
        { wch: 15 }, // Created By
        { wch: 12 }, // Is Converted
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `customers_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Customer data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export customer data');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importedCustomers: Partial<Customer>[] = [];
        const errors: string[] = [];

        jsonData.forEach((row: any, index) => {
          try {
            // Phone number is mandatory
            const phone = String(row['Phone Number'] || row['phone'] || row['Phone'] || '').trim();
            if (!phone) {
              errors.push(`Row ${index + 2}: Phone number is required`);
              return;
            }

            // Validate phone number format (basic validation)
            if (!/^\+?[\d\s\-\(\)]+$/.test(phone)) {
              errors.push(`Row ${index + 2}: Invalid phone number format`);
              return;
            }

            // Name is optional
            const name = String(row['Name'] || row['name'] || '').trim() || undefined;

            // Set all other fields to default values
            const callStatus: CallStatus = 'pending';
            const customCallStatus = undefined;
            const notes = undefined;
            const scheduledDate = undefined;
            const assignedTo = undefined; // No assignment during import

            importedCustomers.push({
              phone,
              name,
              callStatus,
              customCallStatus,
              assignedTo,
              scheduledDate,
              notes,
            });
          } catch (error) {
            errors.push(`Row ${index + 2}: Error processing row - ${error}`);
          }
        });

        if (errors.length > 0) {
          toast.error(`Import completed with ${errors.length} error(s). Check console for details.`);
          console.error('Import errors:', errors);
        }

        if (importedCustomers.length > 0) {
          onImport(importedCustomers);
          toast.success(`Successfully imported ${importedCustomers.length} customer(s)`);
        } else {
          toast.error('No valid customer data found in the file');
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import customer data. Please check the file format.');
      }
    };

    reader.readAsArrayBuffer(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Phone Number': '+1234567890',
        'Name': 'John Doe',
      },
      {
        'Phone Number': '+0987654321',
        'Name': 'Jane Smith',
      },
      {
        'Phone Number': '+1122334455',
        'Name': '', // Name is optional
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Template');
    
    // Add column widths
    ws['!cols'] = [
      { wch: 15 }, // Phone Number
      { wch: 20 }, // Name
    ];

    // Create instructions sheet with role-specific information
    const instructionsData = [
      { 'Field': 'Phone Number', 'Required': 'Yes', 'Description': 'Customer phone number (mandatory and must be unique)' },
      { 'Field': 'Name', 'Required': 'No', 'Description': 'Customer name (optional)' },
      { 'Field': 'Default Values', 'Required': '', 'Description': 'Call Status: pending, Notes: empty, Scheduled Date: none' },
      { 'Field': 'Duplicate Handling', 'Required': '', 'Description': 'Customers with existing phone numbers will be skipped during import' },
      { 'Field': 'Auto-Assignment', 'Required': '', 'Description': canAssignToEmployee ? 'Admin/Manager: Use bulk assignment after import' : 'Employee: Customers will be automatically assigned to you' },
    ];
    
    const instructionsWs = XLSX.utils.json_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');
    instructionsWs['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 60 }];

    XLSX.writeFile(wb, 'customer_import_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={downloadTemplate}
        className="flex items-center gap-2 text-xs sm:text-sm"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Download Template</span>
        <span className="sm:hidden">Template</span>
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 text-xs sm:text-sm"
        title={canAssignToEmployee ? "Import customers (use bulk assignment after import)" : "Import customers (will be automatically assigned to you)"}
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">Import Excel</span>
        <span className="sm:hidden">Import</span>
        {!canAssignToEmployee && (
          <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">(Auto-assign)</span>
        )}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        className="flex items-center gap-2 text-xs sm:text-sm"
        disabled={customers.length === 0}
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export Data</span>
        <span className="sm:hidden">Export</span>
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
}