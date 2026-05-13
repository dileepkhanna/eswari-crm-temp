import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { marketingActions } from '@/hooks/ase-marketing/useASEMarketing';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ActivityFormProps {
  leadId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ActivityForm({ leadId, onSuccess, onCancel }: ActivityFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    activity_type: '',
    title: '',
    description: '',
    call_duration_minutes: '',
    call_outcome: '',
    email_subject: '',
    meeting_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.activity_type || !formData.title.trim()) {
      toast.error('Activity type and title are required');
      return;
    }

    try {
      setLoading(true);
      const data: Record<string, any> = {
        activity_type: formData.activity_type,
        title: formData.title.trim(),
      };
      if (formData.description.trim()) data.description = formData.description.trim();
      if (formData.call_duration_minutes) data.call_duration_minutes = parseInt(formData.call_duration_minutes);
      if (formData.call_outcome.trim()) data.call_outcome = formData.call_outcome.trim();
      if (formData.email_subject.trim()) data.email_subject = formData.email_subject.trim();
      if (formData.meeting_date) data.meeting_date = formData.meeting_date;

      await marketingActions.createActivity(leadId, data);
      toast.success('Activity created');
      setFormData({ activity_type: '', title: '', description: '', call_duration_minutes: '', call_outcome: '', email_subject: '', meeting_date: '' });
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Log Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Activity Type *</Label>
              <Select value={formData.activity_type} onValueChange={(v) => setFormData({ ...formData, activity_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed notes..."
              rows={3}
            />
          </div>

          {/* Type-specific fields */}
          {formData.activity_type === 'call' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.call_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, call_duration_minutes: e.target.value })}
                  placeholder="e.g. 15"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Outcome</Label>
                <Select value={formData.call_outcome} onValueChange={(v) => setFormData({ ...formData, call_outcome: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="voicemail">Voicemail</SelectItem>
                    <SelectItem value="no_answer">No Answer</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="callback">Callback Requested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {formData.activity_type === 'email' && (
            <div className="space-y-2">
              <Label>Email Subject</Label>
              <Input
                value={formData.email_subject}
                onChange={(e) => setFormData({ ...formData, email_subject: e.target.value })}
                placeholder="Email subject line"
              />
            </div>
          )}

          {formData.activity_type === 'meeting' && (
            <div className="space-y-2">
              <Label>Meeting Date & Time</Label>
              <Input
                type="datetime-local"
                value={formData.meeting_date}
                onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Log Activity'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
