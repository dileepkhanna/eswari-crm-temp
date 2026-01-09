import { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Lead, LeadStatus, RequirementType, LeadSource } from '@/types';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface ExcelImportExportProps {
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

export default function ExcelImportExport({ onImport }: ExcelImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="flex gap-2">
      <Button variant="outline" onClick={downloadTemplate} className="gap-2">
        <Download className="w-4 h-4" />
        Download Template
      </Button>
      <Button 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()}
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        Import Excel
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
