import { useState, useEffect } from 'react';
import { FileTextIcon, UserIcon, ClockIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ASECustomer, CustomerNote } from '@/types/ase-customer';
import { ASECustomerService } from '@/services/ase-customer.service';
import { toast } from 'sonner';

interface NotesPanelProps {
  customer: ASECustomer;
}

export default function NotesPanel({ customer }: NotesPanelProps) {
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const data = await ASECustomerService.getNotes(customer.id);
      setNotes(data);
    } catch {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotes(); }, [customer.id]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      setSubmitting(true);
      const note = await ASECustomerService.addNote(customer.id, trimmed);
      setNotes(prev => [note, ...prev]);
      setContent('');
      setShowForm(false);
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileTextIcon className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Notes</span>
          <span className="text-xs text-muted-foreground">({notes.length})</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setShowForm(v => !v)}
        >
          <PlusIcon className="w-3 h-3 mr-1" />
          Add Note
        </Button>
      </div>

      {/* Add Note Form */}
      {showForm && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <Textarea
            placeholder="Write a note about this conversation..."
            value={content}
            onChange={e => setContent(e.target.value)}
            className="text-sm min-h-[80px] resize-none"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowForm(false); setContent(''); }}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={submitting || !content.trim()}>
              {submitting ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-6 text-sm text-muted-foreground">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          No notes yet. Add a note to track conversation context.
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

          {notes.map(note => (
            <div key={note.id} className="relative flex gap-3 pb-4">
              {/* Dot */}
              <div className="relative z-10 mt-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <FileTextIcon className="w-3 h-3 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <UserIcon className="w-3 h-3" />
                    <span className="font-medium text-foreground">{note.author_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ClockIcon className="w-3 h-3" />
                    <span>
                      {new Date(note.created_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-foreground bg-muted/40 rounded px-2 py-1.5 whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
