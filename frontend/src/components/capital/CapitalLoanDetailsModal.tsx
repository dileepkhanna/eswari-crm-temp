import { CapitalLoan } from '@/services/capital.service';
import { Button } from '@/components/ui/button';
import { X, Phone, Mail, MapPin, Building2, Calendar, IndianRupee, Clock, Percent, FileText, User, UserCheck } from 'lucide-react';

interface Props {
  loan: CapitalLoan;
  onClose: () => void;
  onEdit?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-blue-100 text-blue-700',
  documents_pending: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  disbursed: 'bg-teal-100 text-teal-700',
  rejected: 'bg-red-100 text-red-700',
  closed: 'bg-gray-100 text-gray-700',
};

const LOAN_TYPE_LABELS: Record<string, string> = {
  personal: 'Personal Loan',
  business: 'Business Loan',
  home: 'Home Loan',
  vehicle: 'Vehicle Loan',
  education: 'Education Loan',
  gold: 'Gold Loan',
  mortgage: 'Mortgage Loan',
  property: 'Property Loan',
  other: 'Other',
};

// Helper function to format loan type for display
const formatLoanType = (type: string) => {
  return LOAN_TYPE_LABELS[type] || type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export default function CapitalLoanDetailsModal({ loan, onClose, onEdit }: Props) {
  const formatCurrency = (amount?: string | number) => {
    if (!amount) return '—';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateEMI = () => {
    if (!loan.loan_amount || !loan.tenure_months || !loan.interest_rate) return null;
    
    const principal = Number(loan.loan_amount);
    const monthlyRate = Number(loan.interest_rate) / 12 / 100;
    const months = Number(loan.tenure_months);
    
    if (monthlyRate === 0) {
      return principal / months;
    }
    
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                (Math.pow(1 + monthlyRate, months) - 1);
    
    return emi;
  };

  const emi = calculateEMI();
  const totalPayment = emi && loan.tenure_months ? emi * Number(loan.tenure_months) : null;
  const totalInterest = totalPayment && loan.loan_amount ? totalPayment - Number(loan.loan_amount) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Loan Details</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Complete loan application information</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${STATUS_COLORS[loan.status] || 'bg-gray-100 text-gray-700'}`}>
              {loan.status_display || loan.status.replace(/_/g, ' ').toUpperCase()}
            </span>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                Edit Loan
              </Button>
            )}
          </div>

          {/* Applicant Information */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Applicant Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Full Name</div>
                <div className="font-medium text-base">{loan.applicant_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Phone Number
                </div>
                <a href={`tel:${loan.phone}`} className="font-medium text-base text-primary hover:underline">
                  {loan.phone}
                </a>
              </div>
              {loan.email && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email Address
                  </div>
                  <a href={`mailto:${loan.email}`} className="font-medium text-base text-primary hover:underline break-all">
                    {loan.email}
                  </a>
                </div>
              )}
              {loan.address && (
                <div className={loan.email ? 'md:col-span-1' : 'md:col-span-2'}>
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Address
                  </div>
                  <div className="font-medium text-base">{loan.address}</div>
                </div>
              )}
            </div>
          </div>

          {/* Loan Details */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-primary" />
              Loan Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Loan Type</div>
                <div className="font-medium text-base">{formatLoanType(loan.loan_type)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" />
                  Loan Amount
                </div>
                <div className="font-semibold text-lg text-green-600">{formatCurrency(loan.loan_amount)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Tenure
                </div>
                <div className="font-medium text-base">
                  {loan.tenure_months ? `${loan.tenure_months} months` : '—'}
                  {loan.tenure_months && loan.tenure_months >= 12 && (
                    <span className="text-sm text-muted-foreground ml-1">
                      ({Math.floor(Number(loan.tenure_months) / 12)} years)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  Interest Rate
                </div>
                <div className="font-medium text-base">
                  {loan.interest_rate ? `${loan.interest_rate}% per annum` : '—'}
                </div>
              </div>
              {loan.bank_name && (
                <div className="md:col-span-2">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Bank / Financial Institution
                  </div>
                  <div className="font-medium text-base">{loan.bank_name}</div>
                </div>
              )}
            </div>
          </div>

          {/* EMI Calculation */}
          {emi && (
            <div className="glass-card rounded-xl p-5 bg-gradient-to-br from-primary/5 to-primary/10">
              <h3 className="text-lg font-semibold mb-4">EMI Calculation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-background/80 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">Monthly EMI</div>
                  <div className="font-bold text-xl text-primary">{formatCurrency(emi.toFixed(2))}</div>
                </div>
                <div className="bg-background/80 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">Total Payment</div>
                  <div className="font-bold text-xl">{formatCurrency(totalPayment?.toFixed(2))}</div>
                </div>
                <div className="bg-background/80 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">Total Interest</div>
                  <div className="font-bold text-xl text-orange-600">{formatCurrency(totalInterest?.toFixed(2))}</div>
                </div>
              </div>
            </div>
          )}

          {/* Assignment Information */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Assigned To</div>
                <div className="font-medium text-base">{loan.assigned_to_name || 'Unassigned'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Created By</div>
                <div className="font-medium text-base">{loan.created_by_name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Created Date
                </div>
                <div className="font-medium text-base">{formatDate(loan.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Last Updated
                </div>
                <div className="font-medium text-base">{formatDate(loan.updated_at)}</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {loan.notes && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Notes
              </h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4">
                {loan.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {onEdit && (
            <Button onClick={onEdit}>Edit Loan</Button>
          )}
        </div>
      </div>
    </div>
  );
}
