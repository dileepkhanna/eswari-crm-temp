import { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Task, TaskStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContextDjango';
import { canViewCustomerPhone } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TaskExcelImportExportProps {
  tasks?: Task[]; // Add tasks prop for export
  onImport: (tasks: Partial<Task>[]) => void;
  getProjectName?: (projectId?: string) => string; // Add project name resolver
}

const TEMPLATE_COLUMNS = [
  'Lead Name *',
  'Lead Phone *',
  'Lead Email',
  'Requirement Type (villa/apartment/house/plot)',
  'BHK (1/2/3/4/5+)',
  'Project ID *',
  'Status (in_progress/site_visit/family_visit/completed/rejected)',
  'Next Action Date (YYYY-MM-DD)',
  'Notes'
];

const SAMPLE_DATA = [
  ['John Doe', '9876543210', 'john@example.com', 'apartment', '3', 'project-1', 'in_progress', '2024-02-15', 'Initial contact made'],
  ['Jane Smith', '9123456789', 'jane@example.com', 'villa', '4', 'project-2', 'in_progress', '2024-02-20', 'Schedule site visit'],
];

export default function TaskExcelImportExport({ tasks = [], onImport, getProjectName }: TaskExcelImportExportProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only allow import/export for users who can view phone numbers for at least some tasks
  const canViewAnyPhoneNumbers = tasks.some(task => 
    canViewCustomerPhone(user?.role, user?.id, task.lead?.createdBy)
  );
  
  if (!canViewAnyPhoneNumbers) {
    return null;
  }

  const handleExport = () => {
    try {
      if (tasks.length === 0) {
        toast.error('No tasks to export');
        return;
      }

      const exportData = tasks.map(task => ({
        'Lead Name': task.lead?.name || 'Unknown Lead',
        'Lead Phone': task.lead?.phone || '-',
        'Lead Email': task.lead?.email || '-',
        'Requirement Type': task.lead?.requirementType || '-',
        'BHK': task.lead?.bhkRequirement || '-',
        'Budget Min': task.lead?.budgetMin || 0,
        'Budget Max': task.lead?.budgetMax || 0,
        'Project': getProjectName ? getProjectName(task.assignedProject) : task.assignedProject,
        'Status': task.status,
        'Assigned To': task.assignedTo,
        'Next Action Date': task.nextActionDate ? format(task.nextActionDate, 'yyyy-MM-dd') : '',
        'Created Date': format(task.createdAt, 'yyyy-MM-dd'),
        'Notes': task.notes.map(note => note.content).join('; '),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
      
      // Auto-size columns
      const colWidths = [
        { wch: 20 }, // Lead Name
        { wch: 15 }, // Lead Phone
        { wch: 25 }, // Lead Email
        { wch: 15 }, // Requirement Type
        { wch: 8 },  // BHK
        { wch: 12 }, // Budget Min
        { wch: 12 }, // Budget Max
        { wch: 20 }, // Project
        { wch: 15 }, // Status
        { wch: 15 }, // Assigned To
        { wch: 12 }, // Next Action Date
        { wch: 12 }, // Created Date
        { wch: 40 }, // Notes
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `tasks_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Exported ${tasks.length} tasks successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export tasks data');
    }
  };

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
              status: 'hot',
              notes: [],
              createdBy: '3',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            assignedProject: projectId,
            status: ['in_progress', 'site_visit', 'family_visit', 'completed', 'rejected'].includes(status) 
              ? status : 'in_progress',
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
        disabled={tasks.length === 0}
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export Data ({tasks.length})</span>
        <span className="sm:hidden">Export ({tasks.length})</span>
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
