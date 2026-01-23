import { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Lead, LeadStatus, RequirementType, LeadSource } from '@/types';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ExcelImportExportProps {
  leads?: Lead[]; // Add leads prop for export
  onImport: (leads: Partial<Lead>[]) => void;
}

const TEMPLATE_COLUMNS = [
  'Name *',
  'Phone *',
  'Email',
  'Address',
  'Requirement Type (villa/apartment/house/plot)',
  'BHK (1/2/3/4/5+)',
  'Budget Min',
  'Budget Max',
  'Preferred Location',
  'Source (call/walk_in/website/referral)',
  'Status (new/contacted/qualified/converted/lost)',
  'Follow-up Date (YYYY-MM-DD)',
  'Description'
];

const SAMPLE_DATA = [
  ['John Doe', '9876543210', 'john@example.com', '123 Main St', 'apartment', '3', '5000000', '8000000', 'Downtown', 'website', 'new', '', 'Looking for 3BHK apartment'],
  ['Jane Smith', '9123456789', 'jane@example.com', '456 Oak Ave', 'villa', '4', '10000000', '15000000', 'Suburbs', 'referral', 'contacted', '2024-02-15', 'Family looking for villa'],
];

export default function ExcelImportExport({ leads = [], onImport }: ExcelImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      if (leads.length === 0) {
        toast.error('No leads to export');
        return;
      }

      const exportData = leads.map(lead => ({
        'Name': lead.name,
        'Phone': lead.phone,
        'Email': lead.email,
        'Address': lead.address,
        'Requirement Type': lead.requirementType,
        'BHK': lead.bhkRequirement,
        'Budget Min': lead.budgetMin,
        'Budget Max': lead.budgetMax,
        'Preferred Location': lead.preferredLocation,
        'Source': lead.source,
        'Status': lead.status,
        'Follow-up Date': lead.followUpDate ? format(lead.followUpDate, 'yyyy-MM-dd') : '',
        'Description': lead.description,
        'Created Date': format(lead.createdAt, 'yyyy-MM-dd'),
        'Created By': lead.createdBy,
        'Assigned Projects': lead.assignedProjects ? lead.assignedProjects.join(', ') : (lead.assignedProject || ''),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      
      // Auto-size columns
      const colWidths = [
        { wch: 20 }, // Name
        { wch: 15 }, // Phone
        { wch: 25 }, // Email
        { wch: 30 }, // Address
        { wch: 15 }, // Requirement Type
        { wch: 8 },  // BHK
        { wch: 12 }, // Budget Min
        { wch: 12 }, // Budget Max
        { wch: 20 }, // Preferred Location
        { wch: 12 }, // Source
        { wch: 15 }, // Status
        { wch: 12 }, // Follow-up Date
        { wch: 40 }, // Description
        { wch: 12 }, // Created Date
        { wch: 15 }, // Created By
        { wch: 25 }, // Assigned Projects
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Exported ${leads.length} leads successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export leads data');
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, ...SAMPLE_DATA]);
    
    // Set column widths
    ws['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 25 }));
    
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Template');
    XLSX.writeFile(wb, 'leads_import_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        if (jsonData.length < 2) {
          toast.error('No data found in the file');
          return;
        }

        // Skip header row
        const leads: Partial<Lead>[] = [];
        let validCount = 0;
        let invalidCount = 0;

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const name = String(row[0] || '').trim();
          const phone = String(row[1] || '').trim();

          // Name and Phone are required
          if (!name || !phone) {
            invalidCount++;
            continue;
          }

          const requirementType = (String(row[4] || 'apartment').toLowerCase()) as RequirementType;
          const bhk = String(row[5] || '2');
          const source = (String(row[9] || 'website').toLowerCase()) as LeadSource;
          const status = (String(row[10] || 'new').toLowerCase().replace(' ', '_')) as LeadStatus;
          const followUpDateStr = String(row[11] || '');

          let followUpDate: Date | undefined;
          if (followUpDateStr) {
            const parsed = new Date(followUpDateStr);
            if (!isNaN(parsed.getTime())) {
              followUpDate = parsed;
            }
          }

          leads.push({
            name,
            phone,
            email: String(row[2] || ''),
            address: String(row[3] || ''),
            requirementType: ['villa', 'apartment', 'house', 'plot'].includes(requirementType) 
              ? requirementType : 'apartment',
            bhkRequirement: ['1', '2', '3', '4', '5+'].includes(bhk) 
              ? bhk as '1' | '2' | '3' | '4' | '5+' : '2',
            budgetMin: parseInt(String(row[6])) || 0,
            budgetMax: parseInt(String(row[7])) || 0,
            preferredLocation: String(row[8] || ''),
            source: ['call', 'walk_in', 'website', 'referral'].includes(source) 
              ? source : 'website',
            status: ['new', 'contacted', 'qualified', 'converted', 'lost'].includes(status) 
              ? status : 'new',
            followUpDate,
            description: String(row[12] || ''),
          });
          validCount++;
        }

        if (leads.length > 0) {
          onImport(leads);
          toast.success(`Imported ${validCount} leads successfully`, {
            description: invalidCount > 0 ? `${invalidCount} rows skipped (missing required fields)` : undefined,
          });
        } else {
          toast.error('No valid leads found in the file');
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('Failed to parse Excel file');
      }
    };

    reader.readAsArrayBuffer(file);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button variant="outline" onClick={downloadTemplate} className="gap-2 w-full sm:w-auto">
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Download Template</span>
        <span className="sm:hidden">Template</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()}
        className="gap-2 w-full sm:w-auto"
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">Import Excel</span>
        <span className="sm:hidden">Import</span>
      </Button>
      <Button
        variant="outline"
        onClick={handleExport}
        className="gap-2 w-full sm:w-auto"
        disabled={leads.length === 0}
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export Data ({leads.length})</span>
        <span className="sm:hidden">Export ({leads.length})</span>
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
