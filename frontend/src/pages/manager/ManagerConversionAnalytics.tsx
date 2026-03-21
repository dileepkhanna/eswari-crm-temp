import TopBar from '@/components/layout/TopBar';
import { ConversionAnalyticsDashboard } from '@/components/customers/ConversionAnalyticsDashboard';

export default function ManagerConversionAnalytics() {
  return (
    <div className="min-h-screen">
      <TopBar 
        title="Conversion Analytics" 
        subtitle="Track customer-to-lead conversion metrics and performance" 
      />
      <div className="p-4 md:p-6">
        <ConversionAnalyticsDashboard />
      </div>
    </div>
  );
}