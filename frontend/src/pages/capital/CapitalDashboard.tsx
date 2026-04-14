import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { useCapital } from '@/contexts/CapitalCustomerContext';
import { useAuth } from '@/contexts/AuthContextDjango';
import { Users, Landmark, FileText, ClipboardList, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
}

function StatCard({ title, value, sub, icon: Icon, color, onClick }: StatCardProps) {
  return (
    <div
      className={`glass-card rounded-2xl p-5 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

export default function CapitalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { customers, loans, services, tasks, loadingCustomers, loadingLoans, loadingServices, loadingTasks } = useCapital();

  const basePath = user?.role === 'admin' ? '/admin' : user?.role === 'manager' ? '/manager' : '/staff';

  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const convertedCustomers = customers.filter(c => c.is_converted).length;
    const pendingCustomers = customers.filter(c => c.call_status === 'pending').length;

    const totalLoans = loans.length;
    const activeLoans = loans.filter(l => ['inquiry', 'documents_pending', 'under_review', 'approved'].includes(l.status)).length;
    const disbursedLoans = loans.filter(l => l.status === 'disbursed').length;

    const totalServices = services.length;
    const activeServices = services.filter(s => ['inquiry', 'documents_pending', 'in_progress'].includes(s.status)).length;
    const completedServices = services.filter(s => s.status === 'completed').length;

    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter(t => ['in_progress', 'follow_up', 'document_collection', 'processing'].includes(t.status)).length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;

    // Overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'completed').length;

    return {
      totalCustomers, convertedCustomers, pendingCustomers,
      totalLoans, activeLoans, disbursedLoans,
      totalServices, activeServices, completedServices,
      totalTasks, pendingTasks, completedTasks, urgentTasks, overdueTasks,
    };
  }, [customers, loans, services, tasks]);

  const loading = loadingCustomers || loadingLoans || loadingServices || loadingTasks;

  // Recent tasks (top 5 pending)
  const recentTasks = tasks
    .filter(t => t.status !== 'completed' && t.status !== 'rejected')
    .slice(0, 5);

  // Loan status breakdown
  const loanStatusBreakdown = [
    { label: 'Inquiry', count: loans.filter(l => l.status === 'inquiry').length, color: 'bg-blue-100 text-blue-700' },
    { label: 'Docs Pending', count: loans.filter(l => l.status === 'documents_pending').length, color: 'bg-yellow-100 text-yellow-700' },
    { label: 'Under Review', count: loans.filter(l => l.status === 'under_review').length, color: 'bg-purple-100 text-purple-700' },
    { label: 'Approved', count: loans.filter(l => l.status === 'approved').length, color: 'bg-green-100 text-green-700' },
    { label: 'Disbursed', count: loans.filter(l => l.status === 'disbursed').length, color: 'bg-teal-100 text-teal-700' },
    { label: 'Rejected', count: loans.filter(l => l.status === 'rejected').length, color: 'bg-red-100 text-red-700' },
  ].filter(s => s.count > 0);

  // Service category breakdown
  const SERVICE_CATEGORY: Record<string, string> = {
    gst_registration: 'GST', gst_filing_monthly: 'GST', gst_filing_quarterly: 'GST',
    gst_amendment: 'GST', gst_cancellation: 'GST', lut_filing: 'GST', eway_bill: 'GST', gst_consultation: 'GST',
    msme_registration: 'MSME', msme_certificate: 'MSME', msme_amendment: 'MSME',
    itr_filing: 'ITR', itr_notice: 'ITR',
  };
  const gstCount = services.filter(s => SERVICE_CATEGORY[s.service_type] === 'GST').length;
  const msmeCount = services.filter(s => SERVICE_CATEGORY[s.service_type] === 'MSME').length;
  const itrCount = services.filter(s => SERVICE_CATEGORY[s.service_type] === 'ITR').length;

  return (
    <div className="min-h-screen">
      <TopBar title="Eswari Capital" subtitle="Dashboard overview" />
      <div className="p-4 md:p-6 space-y-6">

        {loading && <div className="text-sm text-muted-foreground">Loading...</div>}

        {/* ── Top stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Calls" value={stats.totalCustomers}
            sub={`${stats.convertedCustomers} converted · ${stats.pendingCustomers} pending`}
            icon={Users} color="bg-blue-500"
            onClick={() => navigate(`${basePath}/capital-customers`)} />
          <StatCard title="Loans" value={stats.totalLoans}
            sub={`${stats.activeLoans} active · ${stats.disbursedLoans} disbursed`}
            icon={Landmark} color="bg-green-500"
            onClick={() => navigate(`${basePath}/capital-loans`)} />
          <StatCard title="Services" value={stats.totalServices}
            sub={`${stats.activeServices} active · ${stats.completedServices} completed`}
            icon={FileText} color="bg-orange-500"
            onClick={() => navigate(`${basePath}/capital-services`)} />
          <StatCard title="Tasks" value={stats.totalTasks}
            sub={`${stats.pendingTasks} pending · ${stats.urgentTasks} urgent`}
            icon={ClipboardList} color="bg-purple-500"
            onClick={() => navigate(`${basePath}/capital-tasks`)} />
        </div>

        {/* ── Alert row ── */}
        {(stats.overdueTasks > 0 || stats.urgentTasks > 0) && (
          <div className="flex flex-wrap gap-3">
            {stats.overdueTasks > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm cursor-pointer" onClick={() => navigate(`${basePath}/capital-tasks`)}>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-700 font-medium">{stats.overdueTasks} overdue task{stats.overdueTasks > 1 ? 's' : ''}</span>
              </div>
            )}
            {stats.urgentTasks > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl text-sm cursor-pointer" onClick={() => navigate(`${basePath}/capital-tasks`)}>
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-orange-700 font-medium">{stats.urgentTasks} urgent task{stats.urgentTasks > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Loan pipeline ── */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Landmark className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold text-sm">Loan Pipeline</h3>
            </div>
            {loanStatusBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">No loans yet</p>
            ) : (
              <div className="space-y-2">
                {loanStatusBreakdown.map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
                    <span className="text-sm font-semibold">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Service breakdown ── */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <h3 className="font-semibold text-sm">Services by Category</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'GST', count: gstCount, color: 'bg-orange-500' },
                { label: 'MSME', count: msmeCount, color: 'bg-teal-500' },
                { label: 'Income Tax', count: itrCount, color: 'bg-indigo-500' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-medium">{s.count}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`}
                      style={{ width: stats.totalServices ? `${(s.count / stats.totalServices) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Pending tasks ── */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-purple-600" />
                <h3 className="font-semibold text-sm">Pending Tasks</h3>
              </div>
              <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => navigate(`${basePath}/capital-tasks`)}>View all</span>
            </div>
            {recentTasks.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle className="w-4 h-4" />All caught up
              </div>
            ) : (
              <div className="space-y-2">
                {recentTasks.map(t => (
                  <div key={t.id} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${t.priority === 'urgent' ? 'bg-red-500' : t.priority === 'high' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{t.title || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {t.loan_name || t.service_name || 'Unlinked'} · {t.assigned_to_name || 'Unassigned'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
