import { useState } from 'react';
import { useASELead } from '@/contexts/ASELeadContext';
import { ASELead } from '@/types/ase-customer';
import { toast } from 'sonner';
import { PhoneIcon, BuildingIcon } from 'lucide-react';

const COLUMNS = [
  { status: 'new', label: 'New', color: 'bg-blue-500', light: 'bg-blue-50 border-blue-200' },
  { status: 'contacted', label: 'Contacted', color: 'bg-yellow-500', light: 'bg-yellow-50 border-yellow-200' },
  { status: 'qualified', label: 'Qualified', color: 'bg-green-500', light: 'bg-green-50 border-green-200' },
  { status: 'proposal_sent', label: 'Proposal', color: 'bg-purple-500', light: 'bg-purple-50 border-purple-200' },
  { status: 'negotiating', label: 'Negotiating', color: 'bg-orange-500', light: 'bg-orange-50 border-orange-200' },
  { status: 'nurturing', label: 'Nurturing', color: 'bg-indigo-500', light: 'bg-indigo-50 border-indigo-200' },
  { status: 'on_hold', label: 'On Hold', color: 'bg-gray-500', light: 'bg-gray-50 border-gray-200' },
  { status: 'won', label: 'Won', color: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200' },
  { status: 'lost', label: 'Lost', color: 'bg-red-500', light: 'bg-red-50 border-red-200' },
];

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-700';
    case 'high': return 'bg-orange-100 text-orange-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function LeadCard({ lead, onDragStart }: { lead: ASELead; onDragStart: (e: React.DragEvent, id: string) => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <p className="text-sm font-medium leading-tight line-clamp-1">{lead.company_name}</p>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${getPriorityBadge(lead.priority)}`}>
          {lead.priority}
        </span>
      </div>
      {lead.contact_person && (
        <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{lead.contact_person}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {lead.phone && (
          <span className="flex items-center gap-0.5">
            <PhoneIcon className="w-3 h-3" />
            {lead.phone}
          </span>
        )}
        {lead.budget_amount && (
          <span className="ml-auto font-medium text-gray-700">₹{lead.budget_amount}</span>
        )}
      </div>
      {Array.isArray(lead.service_interests_display) && lead.service_interests_display.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {lead.service_interests_display.slice(0, 2).map((s, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">{s}</span>
          ))}
          {lead.service_interests_display.length > 2 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">+{lead.service_interests_display.length - 2}</span>
          )}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  col,
  leads,
  onDragStart,
  onDrop,
  onDragOver,
  onDragLeave,
  isDragOver,
}: {
  col: typeof COLUMNS[0];
  leads: ASELead[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onDragOver: (e: React.DragEvent, status: string) => void;
  onDragLeave: () => void;
  isDragOver: boolean;
}) {
  return (
    <div className="flex-shrink-0 w-56">
      {/* Column header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border ${col.light}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
        <span className="text-xs font-semibold">{col.label}</span>
        <span className="ml-auto text-xs text-muted-foreground bg-white/70 px-1.5 py-0.5 rounded-full">{leads.length}</span>
      </div>

      {/* Drop zone */}
      <div
        onDrop={(e) => onDrop(e, col.status)}
        onDragOver={(e) => onDragOver(e, col.status)}
        onDragLeave={onDragLeave}
        className={`min-h-[400px] p-2 rounded-b-lg border border-t-0 space-y-2 transition-colors ${
          isDragOver ? 'bg-primary/5 border-primary/30' : 'bg-gray-50/50 border-gray-200'
        }`}
      >
        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-xs text-muted-foreground">
            <BuildingIcon className="w-5 h-5 mb-1 opacity-30" />
            Drop here
          </div>
        )}
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  );
}

export default function LeadKanbanBoard() {
  const { leads, updateLead } = useASELead();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  // Optimistic local overrides: leadId -> status
  const [optimistic, setOptimistic] = useState<Record<string, string>>({});

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(status);
  };

  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!dragId) return;

    const lead = leads.find((l) => l.id === dragId);
    if (!lead) return;
    const currentStatus = optimistic[dragId] ?? lead.status;
    if (currentStatus === newStatus) return;

    // Optimistic update
    setOptimistic((prev) => ({ ...prev, [dragId]: newStatus }));
    setDragId(null);

    try {
      await updateLead(dragId, { status: newStatus as any });
      // Clear optimistic once context refreshes
      setOptimistic((prev) => { const n = { ...prev }; delete n[dragId!]; return n; });
    } catch {
      // Revert
      setOptimistic((prev) => { const n = { ...prev }; delete n[dragId!]; return n; });
      toast.error('Failed to update status');
    }
  };

  // Group leads by status (applying optimistic overrides)
  const grouped = COLUMNS.reduce<Record<string, ASELead[]>>((acc, col) => {
    acc[col.status] = leads.filter((l) => (optimistic[l.id] ?? l.status) === col.status);
    return acc;
  }, {});

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3" style={{ minWidth: `${COLUMNS.length * 240}px` }}>
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            col={col}
            leads={grouped[col.status] || []}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            isDragOver={dragOverCol === col.status}
          />
        ))}
      </div>
    </div>
  );
}
