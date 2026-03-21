import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Lead, LeadStatus, RequirementType, LeadSource } from '@/types';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api';

import { logger } from '@/lib/logger';
interface ExcelImportExportProps {
  leads?: Lead[];
  totalCount?: number;
  onExportAll?: () => Promise<Lead[]>; // fetch all pages for export
  onImport: (leads: Partial<Lead>[]) => void;
  onBulkImportDone?: () => void;
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

export default function ExcelImportExport({ leads = [], totalCount, onExportAll, onImport, onBulkImportDone }: ExcelImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const toExcelRow = (lead: Lead) => ({
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
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      let exportLeads = leads;

      // If a fetch-all callback is provided, use it to get all pages
      if (onExportAll) {
        exportLeads = await onExportAll();
      }

      if (exportLeads.length === 0) {
        toast.error('No leads to export');
        return;
      }

      const exportData = exportLeads.map(toExcelRow);
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');

      ws['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
        { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 12 },
        { wch: 15 }, { wch: 12 }, { wch: 40 }, { wch: 12 }, { wch: 15 }, { wch: 25 },
      ];

      XLSX.writeFile(wb, `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Exported ${exportLeads.length} leads successfully`);
    } catch (error) {
      logger.error('Export error:', error);
      toast.error('Failed to export leads data');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, ...SAMPLE_DATA]);
    ws['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 25 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Template');
    XLSX.writeFile(wb, 'leads_import_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
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

        const leadsPayload: any[] = [];
        let invalidCount = 0;

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const name = String(row[0] || '').trim();
          const phone = String(row[1] || '').trim();
          if (!name || !phone) { invalidCount++; continue; }

          const requirementType = String(row[4] || 'apartment').toLowerCase();
          const bhk = String(row[5] || '2');
          const source = String(row[9] || 'website').toLowerCase();
          const statusVal = String(row[10] || 'new').toLowerCase().replace(' ', '_');

          leadsPayload.push({
            name,
            phone,
            email: String(row[2] || ''),
            address: String(row[3] || ''),
            requirement_type: ['villa', 'apartment', 'house', 'plot'].includes(requirementType) ? requirementType : 'apartment',
            bhk_requirement: ['1', '2', '3', '4', '5+'].includes(bhk) ? bhk : '2',
            budget_min: parseInt(String(row[6])) || 0,
            budget_max: parseInt(String(row[7])) || 0,
            preferred_location: String(row[8] || ''),
            source: ['call', 'walk_in', 'website', 'referral'].includes(source) ? source : 'website',
            status: ['new', 'hot', 'warm', 'cold', 'not_interested', 'reminder'].includes(statusVal) ? statusVal : 'new',
            description: String(row[12] || ''),
          });
        }

        if (leadsPayload.length === 0) {
          toast.error('No valid leads found in the file');
          return;
        }

        toast.info(`Uploading ${leadsPayload.length} leads...`);
        const result: any = await apiClient.bulkImportLeads(leadsPayload);
        toast.success(
          `Imported ${result.imported} leads${invalidCount ? ` (${invalidCount} rows skipped)` : ''}${result.errors?.length ? ` (${result.errors.length} errors)` : ''}`
        );
        if (onBulkImportDone) onBulkImportDone();
        else window.location.reload();
      } catch (error) {
        logger.error('Error parsing Excel file:', error);
        toast.error('Failed to import leads');
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displayCount = totalCount ?? leads.length;

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
        disabled={isExporting || displayCount === 0}
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">{isExporting ? 'Exporting...' : `Export Data (${displayCount})`}</span>
        <span className="sm:hidden">{isExporting ? '...' : `Export (${displayCount})`}</span>
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
