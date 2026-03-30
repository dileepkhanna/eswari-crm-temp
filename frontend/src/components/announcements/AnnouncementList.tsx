import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Eye, Download, FileText, Image, MessageSquare, Edit, Trash2, Power } from 'lucide-react';
import { Announcement } from '@/types';

interface AnnouncementListProps {
  announcements: Announcement[];
  onView: (a: Announcement) => void;
  onViewDocument?: (a: Announcement) => void;
  onDownloadDocument?: (a: Announcement) => void;
  onEdit?: (a: Announcement) => void;
  onToggleActive?: (id: string) => void;
  onDelete?: (a: Announcement) => void;
  canManage?: (a: Announcement) => boolean;
  showTargetRoles?: boolean;
  emptyMessage?: string;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-700 border-red-300';
    case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'low': return 'bg-green-100 text-green-700 border-green-300';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getStatusColor = (isActive: boolean) =>
  isActive ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-300';

const isImageFile = (filename: string) => /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(filename);

export default function AnnouncementList({
  announcements,
  onView,
  onViewDocument,
  onDownloadDocument,
  onEdit,
  onToggleActive,
  onDelete,
  canManage,
  showTargetRoles = false,
  emptyMessage = 'No announcements available',
}: AnnouncementListProps) {
  if (announcements.length === 0) {
    return (
      <div className="glass-card rounded-2xl text-center py-12 px-4">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Always show table layout with horizontal scroll */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap w-[160px]">Title</th>
              <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap w-[140px]">Message</th>
              <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Priority</th>
              {showTargetRoles && <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Roles</th>}
              <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Document</th>
              <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Expires</th>
              <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Status</th>
              <th className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map((a, index) => (
              <tr
                key={a.id}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td className="px-4 py-2.5 w-[160px] max-w-[160px]">
                  <p className="font-medium text-foreground text-sm leading-tight truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">By {a.createdByName || 'Unknown'}</p>
                </td>
                <td className="px-4 py-2.5 w-[140px] max-w-[140px]">
                  <p className="text-sm text-muted-foreground truncate">{a.message}</p>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className={cn('capitalize whitespace-nowrap', getPriorityColor(a.priority))}>
                    {a.priority}
                  </Badge>
                </td>
                {showTargetRoles && (
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {a.targetRoles?.length > 0
                        ? a.targetRoles.map((r, i) => <Badge key={i} variant="outline" className="capitalize text-xs whitespace-nowrap">{r}</Badge>)
                        : <span className="text-sm text-muted-foreground">All</span>}
                    </div>
                  </td>
                )}
                <td className="px-4 py-2.5">
                  {a.document_url && a.document_name ? (
                    <div className="flex items-center gap-1">
                      {isImageFile(a.document_name) ? <Image className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-primary" />}
                      {onViewDocument && <Button variant="ghost" size="sm" onClick={() => onViewDocument(a)} className="h-7 px-2"><Eye className="w-3.5 h-3.5" /></Button>}
                      {onDownloadDocument && <Button variant="ghost" size="sm" onClick={() => onDownloadDocument(a)} className="h-7 px-2"><Download className="w-3.5 h-3.5" /></Button>}
                    </div>
                  ) : <span className="text-sm text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2.5">
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    {a.expiresAt ? format(a.expiresAt, 'MMM dd, yyyy') : 'No expiration'}
                  </p>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className={cn('whitespace-nowrap', getStatusColor(a.isActive))}>
                    {a.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onView(a)} className="h-8 w-8 p-0" title="View">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    {canManage?.(a) && (
                      <>
                        {onEdit && <Button variant="ghost" size="sm" onClick={() => onEdit(a)} className="h-8 w-8 p-0" title="Edit"><Edit className="h-4 w-4" /></Button>}
                        {onToggleActive && <Button variant="ghost" size="sm" onClick={() => onToggleActive(a.id)} className="h-8 w-8 p-0" title="Toggle"><Power className="h-4 w-4" /></Button>}
                        {onDelete && <Button variant="ghost" size="sm" onClick={() => onDelete(a)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" title="Delete"><Trash2 className="h-4 w-4" /></Button>}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
