import { CapitalService } from '@/services/capital.service';
import { Button } from '@/components/ui/button';
import { X, Phone, Mail, MapPin, Building2, Calendar, FileText, User, UserCheck, Briefcase, Hash } from 'lucide-react';

interface Props {
  service: CapitalService;
  onClose: () => void;
  onEdit?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-blue-100 text-blue-700',
  documentation: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  on_hold: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  gst_registration: 'GST Registration (New)',
  gst_filing_monthly: 'GST Return Filing (Monthly)',
  gst_filing_quarterly: 'GST Return Filing (Quarterly)',
  gst_amendment: 'GST Amendment / Update',
  gst_cancellation: 'GST Cancellation',
  lut_filing: 'LUT Filing (Exports)',
  eway_bill: 'E-Way Bill Generation',
  gst_consultation: 'GST Consultation / Advisory',
  msme_registration: 'MSME / Udyam Registration',
  msme_certificate: 'MSME Certificate Download',
  msme_amendment: 'MSME Amendment',
  itr_filing: 'Income Tax Filing',
  itr_notice: 'Income Tax Notice',
  company_registration: 'Company Registration',
  trademark: 'Trademark Registration',
  gst_filing: 'GST Filing',
  income_tax_filing: 'Income Tax Filing',
  tds_filing: 'TDS Filing',
  accounting: 'Accounting Services',
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  proprietorship: 'Proprietorship',
  partnership: 'Partnership',
  llp: 'LLP',
  private_limited: 'Private Limited',
  public_limited: 'Public Limited',
  proprietor: 'Proprietor',
  company: 'Company',
  other: 'Other',
};

const INCOME_SLAB_LABELS: Record<string, string> = {
  below_5l: 'Below ₹5 Lakh',
  '5l_10l': '₹5 Lakh to ₹10 Lakh',
  '10l_25l': '₹10 Lakh to ₹25 Lakh',
  '25l_50l': '₹25 Lakh to ₹50 Lakh',
  above_50l: 'Above ₹50 Lakh',
  '0_5l': '0 to ₹5 Lakh',
  '10l_18l': '₹10 Lakh to ₹18 Lakh',
  above_18l: '₹18 Lakh and above',
};

const TURNOVER_LABELS: Record<string, string> = {
  below_20l: 'Below ₹20 Lakhs',
  '20l_40l': '₹20L – ₹40L',
  '40l_1cr': '₹40L – ₹1 Cr',
  '1cr_5cr': '₹1 Cr – ₹5 Cr',
  '5cr_10cr': '₹5 Cr – ₹10 Cr',
  above_10cr: 'Above ₹10 Cr',
  '20l_1cr': '₹20L – ₹1 Cr',
  above_1cr: 'Above ₹1 Cr',
};

// Helper function to format service type for display
const formatServiceType = (type: string) => {
  return SERVICE_TYPE_LABELS[type] || type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export default function CapitalServiceDetailsModal({ service, onClose, onEdit }: Props) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Service Details</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Complete service information</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${STATUS_COLORS[service.status] || 'bg-gray-100 text-gray-700'}`}>
              {service.status_display || service.status.replace(/_/g, ' ').toUpperCase()}
            </span>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                Edit Service
              </Button>
            )}
          </div>

          {/* Client Information */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Client Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Client Name</div>
                <div className="font-medium text-base">{service.client_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Phone Number
                </div>
                <a href={`tel:${service.phone}`} className="font-medium text-base text-primary hover:underline">
                  {service.phone}
                </a>
              </div>
              {service.email && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email Address
                  </div>
                  <a href={`mailto:${service.email}`} className="font-medium text-base text-primary hover:underline break-all">
                    {service.email}
                  </a>
                </div>
              )}
              {service.business_name && (
                <div className={service.email ? 'md:col-span-1' : 'md:col-span-2'}>
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Business Name
                  </div>
                  <div className="font-medium text-base">{service.business_name}</div>
                </div>
              )}
            </div>
          </div>

          {/* Service Details */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Service Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Service Type</div>
                <div className="font-medium text-base">{formatServiceType(service.service_type)}</div>
              </div>
              {service.financial_year && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Financial Year
                  </div>
                  <div className="font-medium text-base">{service.financial_year}</div>
                </div>
              )}
              {service.business_type && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Business Type</div>
                  <div className="font-medium text-base">{BUSINESS_TYPE_LABELS[service.business_type] || service.business_type}</div>
                </div>
              )}
              {service.service_fee && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Service Fee</div>
                  <div className="font-semibold text-lg text-green-600">{formatCurrency(service.service_fee)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Tax & Registration Details */}
          {(service.pan_number || service.gstin || service.aadhaar_number || service.income_slab || service.turnover_range) && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5 text-primary" />
                Tax & Registration Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {service.pan_number && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">PAN Number</div>
                    <div className="font-medium text-base font-mono">{service.pan_number}</div>
                  </div>
                )}
                {service.gstin && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">GSTIN</div>
                    <div className="font-medium text-base font-mono">{service.gstin}</div>
                  </div>
                )}
                {service.aadhaar_number && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Aadhaar Number</div>
                    <div className="font-medium text-base font-mono">{service.aadhaar_number}</div>
                  </div>
                )}
                {service.income_slab && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Income Slab</div>
                    <div className="font-medium text-base">{INCOME_SLAB_LABELS[service.income_slab] || service.income_slab}</div>
                  </div>
                )}
                {service.turnover_range && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Turnover Range</div>
                    <div className="font-medium text-base">{TURNOVER_LABELS[service.turnover_range] || service.turnover_range}</div>
                  </div>
                )}
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
                <div className="font-medium text-base">{service.assigned_to_name || 'Unassigned'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Created By</div>
                <div className="font-medium text-base">{service.created_by_name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Created Date
                </div>
                <div className="font-medium text-base">{formatDate(service.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Last Updated
                </div>
                <div className="font-medium text-base">{formatDate(service.updated_at)}</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {service.notes && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Notes
              </h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4">
                {service.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {onEdit && (
            <Button onClick={onEdit}>Edit Service</Button>
          )}
        </div>
      </div>
    </div>
  );
}
