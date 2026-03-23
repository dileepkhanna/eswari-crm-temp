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
      {/* Mobile card layout */}
      <div className="flex flex-col gap-4 md:hidden">
        {announcements.map((a, index) => (
          <div
            key={a.id}
            className="glass-card rounded-2xl p-5 space-y-3 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-base leading-tight">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">By {a.createdByName || 'Unknown'}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Badge variant="outline" className={cn('capitalize text-xs', getPriorityColor(a.priority))}>
                  {a.priority}
                </Badge>
                <Badge variant="outline" className={cn('text-xs', getStatusColor(a.isActive))}>
                  {a.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Message preview */}
            <p className="text-sm text-muted-foreground line-clamp-3">{a.message}</p>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Created: {format(a.createdAt, 'MMM dd, yyyy')}</span>
              {a.expiresAt && <span>Expires: {format(a.expiresAt, 'MMM dd, yyyy')}</span>}
            </div>

            {/* Target roles */}
            {showTargetRoles && a.targetRoles && a.targetRoles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {a.targetRoles.map((role, i) => (
                  <Badge key={i} variant="outline" className="capitalize text-xs">{role}</Badge>
                ))}
              </div>
            )}

            {/* Document */}
            {a.document_url && a.document_name && (
              <div className="flex items-center gap-2">
                {isImageFile(a.document_name)
                  ? <Image className="w-4 h-4 text-blue-500 shrink-0" />
                  : <FileText className="w-4 h-4 text-primary shrink-0" />}
                <span className="text-xs text-muted-foreground truncate flex-1">{a.document_name}</span>
                {onViewDocument && (
                  <Button variant="ghost" size="sm" onClick={() => onViewDocument(a)} className="h-7 px-2">
                    <Eye className="w-3 h-3" />
                  </Button>
                )}
                {onDownloadDocument && (
                  <Button variant="ghost" size="sm" onClick={() => onDownloadDocument(a)} className="h-7 px-2">
                    <Download className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1 border-t border-border/50">
              <Button variant="outline" size="sm" onClick={() => onView(a)} className="flex-1 h-9 text-xs gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> View
              </Button>
              {canManage?.(a) && (
                <>
                  {onEdit && (
                    <Button variant="outline" size="sm" onClick={() => onEdit(a)} className="flex-1 h-9 text-xs gap-1">
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </Button>
                  )}
                  {onToggleActive && (
                    <Button variant="outline" size="sm" onClick={() => onToggleActive(a.id)} className="h-9 px-3">
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="outline" size="sm" onClick={() => onDelete(a)} className="h-9 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block glass-card rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-sm font-semibold">Title</th>
              <th className="text-left px-4 py-3 text-sm font-semibold hidden lg:table-cell">Message</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Priority</th>
              {showTargetRoles && <th className="text-left px-4 py-3 text-sm font-semibold hidden xl:table-cell">Roles</th>}
              <th className="text-left px-4 py-3 text-sm font-semibold hidden xl:table-cell">Document</th>
              <th className="text-left px-4 py-3 text-sm font-semibold hidden xl:table-cell">Expires</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Status</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map((a, index) => (
              <tr
                key={a.id}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">By {a.createdByName || 'Unknown'}</p>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">{a.message}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={cn('capitalize', getPriorityColor(a.priority))}>
                    {a.priority}
                  </Badge>
                </td>
                {showTargetRoles && (
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {a.targetRoles?.length > 0
                        ? a.targetRoles.map((r, i) => <Badge key={i} variant="outline" className="capitalize text-xs">{r}</Badge>)
                        : <span className="text-sm text-muted-foreground">All</span>}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 hidden xl:table-cell">
                  {a.document_url && a.document_name ? (
                    <div className="flex items-center gap-1">
                      {isImageFile(a.document_name) ? <Image className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-primary" />}
                      {onViewDocument && <Button variant="ghost" size="sm" onClick={() => onViewDocument(a)} className="h-6 px-2"><Eye className="w-3 h-3" /></Button>}
                      {onDownloadDocument && <Button variant="ghost" size="sm" onClick={() => onDownloadDocument(a)} className="h-6 px-2"><Download className="w-3 h-3" /></Button>}
                    </div>
                  ) : <span className="text-sm text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 hidden xl:table-cell">
                  <p className="text-sm text-muted-foreground">
                    {a.expiresAt ? format(a.expiresAt, 'MMM dd, yyyy') : 'No expiration'}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={cn(getStatusColor(a.isActive))}>
                    {a.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
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
    </>
  );
}
