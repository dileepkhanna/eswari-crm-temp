import { useState, useEffect } from 'react';
import { PhoneIcon, ClockIcon, UserIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ASECustomer, CallLog, ASE_CALL_STATUS_OPTIONS } from '@/types/ase-customer';
import { ASECustomerService } from '@/services/ase-customer.service';
import { toast } from 'sonner';

interface CallLogPanelProps {
  customer: ASECustomer;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  answered: 'bg-green-100 text-green-700 border-green-300',
  not_answered: 'bg-red-100 text-red-700 border-red-300',
  busy: 'bg-orange-100 text-orange-700 border-orange-300',
  not_interested: 'bg-gray-100 text-gray-700 border-gray-300',
  custom: 'bg-purple-100 text-purple-700 border-purple-300',
};

const DOT_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  answered: 'bg-green-500',
  not_answered: 'bg-red-500',
  busy: 'bg-orange-500',
  not_interested: 'bg-gray-500',
  custom: 'bg-purple-500',
};

export default function CallLogPanel({ customer }: CallLogPanelProps) {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ call_status: customer.call_status, custom_status: '', notes: '' });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await ASECustomerService.getCallLogs(customer.id);
      setLogs(data);
    } catch {
      toast.error('Failed to load call history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [customer.id]);

  const handleSubmit = async () => {
    if (!form.call_status) return;
    try {
      setSubmitting(true);
      await ASECustomerService.addCallLog(customer.id, {
        call_status: form.call_status,
        custom_status: form.call_status === 'custom' ? form.custom_status : undefined,
        notes: form.notes || undefined,
      });
      toast.success('Call log added');
      setForm({ call_status: customer.call_status, custom_status: '', notes: '' });
      setShowForm(false);
      fetchLogs();
    } catch {
      toast.error('Failed to add call log');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhoneIcon className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Call History</span>
          <span className="text-xs text-muted-foreground">({logs.length})</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setShowForm(v => !v)}
        >
          <PlusIcon className="w-3 h-3 mr-1" />
          Log Call
        </Button>
      </div>

      {/* Add Log Form */}
      {showForm && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <Select value={form.call_status} onValueChange={v => setForm(f => ({ ...f, call_status: v }))}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Call Status" />
            </SelectTrigger>
            <SelectContent>
              {ASE_CALL_STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {form.call_status === 'custom' && (
            <input
              className="w-full border rounded px-3 py-1.5 text-sm"
              placeholder="Custom status label..."
              value={form.custom_status}
              onChange={e => setForm(f => ({ ...f, custom_status: e.target.value }))}
            />
          )}

          <Textarea
            placeholder="Notes (optional)..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="text-sm min-h-[60px] resize-none"
          />

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-6 text-sm text-muted-foreground">Loading history...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          No call history yet. Status changes are logged automatically.
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

          {logs.map((log, i) => (
            <div key={log.id} className="relative flex gap-3 pb-4">
              {/* Dot */}
              <div className={`relative z-10 mt-1 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${DOT_COLORS[log.call_status] || 'bg-gray-400'}`}>
                <PhoneIcon className="w-3 h-3 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[log.call_status] || 'bg-gray-100 text-gray-700'}`}>
                    {log.call_status_display}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <UserIcon className="w-3 h-3" />
                    <span>{log.called_by_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ClockIcon className="w-3 h-3" />
                    <span>
                      {new Date(log.called_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                {log.notes && (
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1 mt-1">
                    {log.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
