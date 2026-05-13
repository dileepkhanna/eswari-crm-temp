import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  qualified: { label: 'Qualified', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  contacted: { label: 'Contacted', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  nurturing: { label: 'Nurturing', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  proposal_sent: { label: 'Proposal Sent', className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  negotiating: { label: 'Negotiating', className: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  won: { label: 'Won', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  lost: { label: 'Lost', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

interface LeadStatusBadgeProps {
  status: string;
  className?: string;
}

export function LeadStatusBadge({ status, className = '' }: LeadStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' };

  return (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      {config.label}
    </Badge>
  );
}
