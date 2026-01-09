import { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Task, TaskStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContextDjango';
import { canViewCustomerPhone } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface TaskExcelImportExportProps {
  onImport: (tasks: Partial<Task>[]) => void;
}

const TEMPLATE_COLUMNS = [
  'Lead Name *',
  'Lead Phone *',
  'Lead Email',
  'Requirement Type (villa/apartment/house/plot)',
  'BHK (1/2/3/4/5+)',
  'Project ID *',
  'Status (todo/in_progress/review/completed)',
  'Next Action Date (YYYY-MM-DD)',
  'Notes'
];

const SAMPLE_DATA = [
  ['John Doe', '9876543210', 'john@example.com', 'apartment', '3', 'project-1', 'todo', '2024-02-15', 'Initial contact made'],
  ['Jane Smith', '9123456789', 'jane@example.com', 'villa', '4', 'project-2', 'in_progress', '2024-02-20', 'Schedule site visit'],
];

export default function TaskExcelImportExport({ onImport }: TaskExcelImportExportProps) {
  const { user } = useAuth();
  const canViewPhone = user ? canViewCustomerPhone(user.role) : false;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only allow import/export for users who can view phone numbers
  if (!canViewPhone) {
    return null;
  }

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, ...SAMPLE_DATA]);
    
    // Set column widths
    ws['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 25 }));
    
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks Template');
    XLSX.writeFile(wb, 'tasks_import_template.xlsx');
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
        const tasks: Partial<Task>[] = [];
        let validCount = 0;
        let invalidCount = 0;

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const leadName = String(row[0] || '').trim();
          const leadPhone = String(row[1] || '').trim();
          const projectId = String(row[5] || '').trim();

          // Lead Name, Phone, and Project are required
          if (!leadName || !leadPhone || !projectId) {
            invalidCount++;
            continue;
          }

          const requirementType = (String(row[3] || 'apartment').toLowerCase()) as 'villa' | 'apartment' | 'house' | 'plot';
          const bhk = String(row[4] || '2');
          const status = (String(row[6] || 'pending').toLowerCase().replace(' ', '_')) as TaskStatus;
          const nextActionDateStr = String(row[7] || '');

          let nextActionDate: Date | undefined;
          if (nextActionDateStr) {
            const parsed = new Date(nextActionDateStr);
            if (!isNaN(parsed.getTime())) {
              nextActionDate = parsed;
            }
          }

          tasks.push({
            lead: {
              id: String(Date.now() + i),
              name: leadName,
              phone: leadPhone,
              email: String(row[2] || ''),
              address: '',
              requirementType: ['villa', 'apartment', 'house', 'plot'].includes(requirementType) 
                ? requirementType : 'apartment',
              bhkRequirement: ['1', '2', '3', '4', '5+'].includes(bhk) 
                ? bhk as '1' | '2' | '3' | '4' | '5+' : '2',
              budgetMin: 0,
              budgetMax: 0,
              description: '',
              status: 'pending',
              notes: [],
              createdBy: '3',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            assignedProject: projectId,
            status: ['visit', 'family_visit', 'pending', 'completed', 'rejected'].includes(status) 
              ? status : 'pending',
            nextActionDate,
            notes: row[8] ? [{ 
              id: String(Date.now()), 
              content: String(row[8]), 
              createdBy: '3', 
              createdAt: new Date() 
            }] : [],
            attachments: [],
            assignedTo: '3',
          });
          validCount++;
        }

        if (tasks.length > 0) {
          onImport(tasks);
          toast.success(`Imported ${validCount} tasks successfully`, {
            description: invalidCount > 0 ? `${invalidCount} rows skipped (missing required fields)` : undefined,
          });
        } else {
          toast.error('No valid tasks found in the file');
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
