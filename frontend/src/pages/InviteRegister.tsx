import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface InviteInfo {
  role: string;
  company_id: number | null;
  company_name: string | null;
}

type FormKey = 'first_name' | 'last_name' | 'email' | 'phone' | 'password' | 'confirm_password' |
  'designation' | 'joining_date' | 'present_address' | 'permanent_address' |
  'blood_group' | 'aadhar_number' | 'bank_name' | 'bank_account_number' | 'bank_ifsc' |
  'emergency_contact1_name' | 'emergency_contact1_phone' | 'emergency_contact1_relation' |
  'emergency_contact2_name' | 'emergency_contact2_phone' | 'emergency_contact2_relation';

const initialForm: Record<FormKey, string> = {
  first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '',
  designation: '', joining_date: '', present_address: '', permanent_address: '',
  blood_group: '', aadhar_number: '', bank_name: '', bank_account_number: '', bank_ifsc: '',
  emergency_contact1_name: '', emergency_contact1_phone: '', emergency_contact1_relation: '',
  emergency_contact2_name: '', emergency_contact2_phone: '', emergency_contact2_relation: '',
};

export default function InviteRegister() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [validating, setValidating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [sameAsPresent, setSameAsPresent] = useState(false);
  const [declared, setDeclared] = useState(false);
  const [form, setForm] = useState<Record<FormKey, string>>(initialForm);

  useEffect(() => {
    if (!token) { setTokenError('No invite token provided.'); setValidating(false); return; }
    apiClient.validateInvite(token)
      .then((res: any) => setInviteInfo({ role: res.role, company_id: res.company_id, company_name: res.company_name }))
      .catch((err: any) => {
        try {
          const msg = JSON.parse(err.message.split('details: ')[1])?.error;
          setTokenError(msg || 'Invalid or expired invite link.');
        } catch { setTokenError('Invalid or expired invite link.'); }
      })
      .finally(() => setValidating(false));
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'present_address' && sameAsPresent) next.permanent_address = value;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) { toast.error('Passwords do not match'); return; }
    if (form.aadhar_number.length !== 12 || !/^\d+$/.test(form.aadhar_number)) {
      toast.error('Aadhar number must be exactly 12 digits'); return;
    }
    setSubmitting(true);
    try {
      const { confirm_password, ...rest } = form;
      await apiClient.inviteRegister({ ...rest, token });
      setDone(true);
    } catch (err: any) {
      try {
        const msg = JSON.parse(err.message.split('details: ')[1])?.error;
        toast.error(msg || 'Registration failed.');
      } catch { toast.error('Registration failed. Please try again.'); }
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (tokenError) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <XCircle className="w-16 h-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">Invalid Invite</h1>
        <p className="text-muted-foreground">{tokenError}</p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold">Registration Successful!</h1>
        <p className="text-muted-foreground">
          Your account is pending admin approval. You'll be able to log in once approved.
        </p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    </div>
  );

  const req = <span className="text-destructive ml-1">*</span>;

  return (
    <div className="h-screen bg-muted/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="text-center py-4 px-4 shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Create Your Account</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          You've been invited as <strong className="capitalize">{inviteInfo?.role}</strong>
          {inviteInfo?.company_name && <> at <strong>{inviteInfo.company_name}</strong></>}
        </p>
      </div>

      {/* Form card — full width on mobile, max-w-2xl centered on desktop */}
      <div className="flex-1 flex flex-col sm:items-center sm:pb-8 px-0 sm:px-4 min-h-0">
        <form
          onSubmit={handleSubmit}
          className="bg-background sm:rounded-2xl sm:shadow-sm sm:border flex flex-col w-full sm:max-w-2xl h-full sm:max-h-[80vh]"
        >
          <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">

          {/* Basic Info */}
          <section className="space-y-4">
            <h2 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground border-b pb-2">Basic Information</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="first_name">First Name {req}</Label>
                <Input id="first_name" name="first_name" placeholder="First name" value={form.first_name} onChange={handleChange} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="last_name">Last Name {req}</Label>
                <Input id="last_name" name="last_name" placeholder="Last name" value={form.last_name} onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email {req}</Label>
              <Input id="email" name="email" type="email" placeholder="your@email.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone {req}</Label>
              <Input id="phone" name="phone" inputMode="numeric" placeholder="10-digit phone number" value={form.phone} onChange={handleChange} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="password">Password {req}</Label>
                <Input id="password" name="password" type="password" placeholder="Min 8 characters" value={form.password} onChange={handleChange} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm_password">Confirm Password {req}</Label>
                <Input id="confirm_password" name="confirm_password" type="password" placeholder="Repeat password" value={form.confirm_password} onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="designation">Designation {req}</Label>
              <Input id="designation" name="designation" placeholder="e.g. Software Engineer" value={form.designation} onChange={handleChange} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="joining_date">Joining Date {req}</Label>
              <Input id="joining_date" name="joining_date" type="date" value={form.joining_date} onChange={handleChange} required />
            </div>
          </section>

          {/* Address */}
          <section className="space-y-4">
            <h2 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground border-b pb-2">Address</h2>
            <div className="space-y-1">
              <Label htmlFor="present_address">Present Address {req}</Label>
              <Input id="present_address" name="present_address" placeholder="Current address" value={form.present_address} onChange={handleChange} required />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="same" checked={sameAsPresent} onCheckedChange={checked => {
                setSameAsPresent(!!checked);
                if (checked) setForm(p => ({ ...p, permanent_address: p.present_address }));
              }} />
              <label htmlFor="same" className="text-sm text-muted-foreground cursor-pointer select-none">
                Permanent address same as present
              </label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="permanent_address">Permanent Address {req}</Label>
              <Input id="permanent_address" name="permanent_address" placeholder="Permanent address"
                value={form.permanent_address} onChange={handleChange} disabled={sameAsPresent} required />
            </div>
          </section>

          {/* Personal */}
          <section className="space-y-4">
            <h2 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground border-b pb-2">Personal Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="blood_group">Blood Group {req}</Label>
                <Input id="blood_group" name="blood_group" placeholder="e.g. A+, O-" value={form.blood_group} onChange={handleChange} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="aadhar_number">Aadhar No. {req}</Label>
                <Input id="aadhar_number" name="aadhar_number" inputMode="numeric" placeholder="12 digits" maxLength={12} value={form.aadhar_number} onChange={handleChange} required />
              </div>
            </div>
          </section>

          {/* Bank */}
          <section className="space-y-4">
            <h2 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground border-b pb-2">Bank Details</h2>
            <div className="space-y-1">
              <Label htmlFor="bank_name">Bank Name {req}</Label>
              <Input id="bank_name" name="bank_name" placeholder="Bank name" value={form.bank_name} onChange={handleChange} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bank_account_number">Account Number {req}</Label>
              <Input id="bank_account_number" name="bank_account_number" inputMode="numeric" placeholder="Account number" value={form.bank_account_number} onChange={handleChange} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bank_ifsc">IFSC Code {req}</Label>
              <Input id="bank_ifsc" name="bank_ifsc" placeholder="IFSC code" value={form.bank_ifsc} onChange={handleChange} required />
            </div>
          </section>

          {/* Emergency Contacts */}
          <section className="space-y-4">
            <h2 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground border-b pb-2">Emergency Contacts</h2>

            <p className="text-xs font-medium text-muted-foreground uppercase">Contact 1</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="emergency_contact1_name">Name {req}</Label>
                <Input id="emergency_contact1_name" name="emergency_contact1_name" placeholder="Name" value={form.emergency_contact1_name} onChange={handleChange} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emergency_contact1_relation">Relation {req}</Label>
                <Input id="emergency_contact1_relation" name="emergency_contact1_relation" placeholder="e.g. Father" value={form.emergency_contact1_relation} onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="emergency_contact1_phone">Phone {req}</Label>
              <Input id="emergency_contact1_phone" name="emergency_contact1_phone" inputMode="numeric" placeholder="Phone number" value={form.emergency_contact1_phone} onChange={handleChange} required />
            </div>

            <p className="text-xs font-medium text-muted-foreground uppercase pt-2">Contact 2</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="emergency_contact2_name">Name {req}</Label>
                <Input id="emergency_contact2_name" name="emergency_contact2_name" placeholder="Name" value={form.emergency_contact2_name} onChange={handleChange} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emergency_contact2_relation">Relation {req}</Label>
                <Input id="emergency_contact2_relation" name="emergency_contact2_relation" placeholder="e.g. Mother" value={form.emergency_contact2_relation} onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="emergency_contact2_phone">Phone {req}</Label>
              <Input id="emergency_contact2_phone" name="emergency_contact2_phone" inputMode="numeric" placeholder="Phone number" value={form.emergency_contact2_phone} onChange={handleChange} required />
            </div>
          </section>

          {/* Declaration */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border">
            <Checkbox
              id="declaration"
              checked={declared}
              onCheckedChange={c => setDeclared(!!c)}
              className="mt-0.5 shrink-0"
            />
            <label htmlFor="declaration" className="text-sm text-muted-foreground cursor-pointer leading-relaxed select-none">
              I hereby declare that all the details furnished by me in this form are true, complete, and correct to the best of my knowledge, and I understand that any discrepancy may lead to appropriate action.
            </label>
          </div>

          </div>{/* end scrollable area */}

          <div className="p-4 sm:p-6 sm:pt-4 border-t shrink-0">
            <Button type="submit" className="w-full" disabled={submitting || !declared}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Create Account'}
            </Button>
            {!declared && (
              <p className="text-xs text-muted-foreground text-center mt-2">Please accept the declaration to submit</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
