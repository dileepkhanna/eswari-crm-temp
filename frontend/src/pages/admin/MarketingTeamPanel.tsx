import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextDjango';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  TrendingUp, 
  Share2, 
  FileText, 
  Mail, 
  Target,
  UserCircle,
  Phone,
  Calendar,
  Briefcase,
  MessageSquare,
  Megaphone,
  CalendarDays,
  Gift,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';

// Role-based dashboards
import BREDashboard from '@/components/ase-marketing/dashboards/BREDashboard';
import BOEDashboard from '@/components/ase-marketing/dashboards/BOEDashboard';
import BOELeadsAdmin from '@/components/ase-marketing/dashboards/BOELeads';
import CREDashboard from '@/components/ase-marketing/dashboards/CREDashboard';
import MarketingLeadDashboard from '@/components/ase-marketing/dashboards/MarketingLeadDashboard';
import { TaskList } from '@/components/ase-marketing/tasks/TaskList';

interface Team {
  id: number;
  name: string;
  team_type: string;
  description: string;
  team_lead: any;
  member_count: number;
  is_active: boolean;
}

interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  role: string;
  team: number;
  team_info?: {
    id: number;
    name: string;
    team_type: string;
  };
  joining_date: string;
}

const teamIcons: Record<string, React.ElementType> = {
  'SEO Team': TrendingUp,
  'Social Media Team': Share2,
  'Content Writing': FileText,
  'PPC/Ads Team': Target,
  'Email Marketing': Mail,
  'Graphic Design': FileText,
  'Sales Team': Target,
  'Account Management': Users,
  'Customer Support': MessageSquare,
  'Technical Support': MessageSquare,
};

export default function MarketingTeamPanel() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [breMembers, setBreMembers] = useState<string[]>([]);
  const [boeMembers, setBoeMembers] = useState<string[]>([]);
  const [creMembers, setCreMembers] = useState<string[]>([]);

  // Fetch marketing teams
  useEffect(() => {
    fetchMarketingTeams();
    // Fetch team members for each category
    const fetchMembers = async () => {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      try {
        // Fetch users by team for each marketing category
        const [breRes, boeRes, creRes] = await Promise.all([
          fetch('http://localhost:8000/api/auth/users/?company=2', { headers }),
          fetch('http://localhost:8000/api/ase-leads/boe-users/', { headers }),
          fetch('http://localhost:8000/api/ase-leads/cre-users/', { headers }),
        ]);
        if (breRes.ok) {
          const data = await breRes.json();
          const users = data?.results || data || [];
          // Filter BRE team members by team marketing_category
          const bre = users.filter((u: any) => u.team_info?.marketing_category === 'bre');
          setBreMembers(bre.map((u: any) => `${u.first_name} ${u.last_name}`.trim() || u.username));
          // Also get BOE from same response
          const boe = users.filter((u: any) => u.team_info?.marketing_category === 'boe');
          if (boe.length > 0) setBoeMembers(boe.map((u: any) => `${u.first_name} ${u.last_name}`.trim() || u.username));
          const cre = users.filter((u: any) => u.team_info?.marketing_category === 'cre');
          if (cre.length > 0) setCreMembers(cre.map((u: any) => `${u.first_name} ${u.last_name}`.trim() || u.username));
        }
        // Fallback for BOE/CRE if not found from users endpoint
        if (boeMembers.length === 0 && boeRes.ok) {
          const data = await boeRes.json();
          setBoeMembers(data.map((u: any) => `${u.first_name} ${u.last_name}`.trim() || u.username || u.name));
        }
        if (creMembers.length === 0 && creRes.ok) {
          const data = await creRes.json();
          setCreMembers(data.map((u: any) => u.name || `${u.first_name} ${u.last_name}`.trim() || u.username));
        }
      } catch (err) {}
    };
    fetchMembers();
  }, []);

  const fetchMarketingTeams = async () => {
    try {
      setLoading(true);
      // Get ASE Technologies company ID (assuming it's 2)
      const response = await apiClient.getTeams({ company: 2, team_type: 'marketing' });
      const teamsData = response?.results || response || [];
      setTeams(teamsData);
      
      // Select first team by default
      if (teamsData.length > 0) {
        setSelectedTeam(teamsData[0]);
        fetchTeamMembers(teamsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching marketing teams:', error);
      toast.error('Failed to load marketing teams');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (teamId: number) => {
    try {
      setLoadingMembers(true);
      // Fetch users with this team
      const response = await apiClient.get('/auth/users/', { team: teamId });
      const users = response?.results || response?.users || [];
      setTeamMembers(users);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    fetchTeamMembers(team.id);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'team_lead':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'manager':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'employee':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    // Don't block team members with loading state - show their dashboard immediately
    const marketingCategory = user?.team_info?.marketing_category;
    const isAdmin = user?.role === 'admin' || user?.role === 'manager';
    if (!isAdmin && marketingCategory) {
      switch (marketingCategory) {
        case 'bre':
          return <BREDashboard />;
        case 'boe':
          return <BOEDashboard />;
        case 'cre':
          return <CREDashboard />;
        case 'marketing_lead':
          return <MarketingLeadDashboard />;
      }
    }
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Determine which dashboard to show based on user role
  const marketingCategory = user?.team_info?.marketing_category;
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  // For team members, show their role-specific dashboard
  if (!isAdmin && marketingCategory) {
    switch (marketingCategory) {
      case 'bre':
        return <BREDashboard />;
      case 'boe':
        return <BOEDashboard />;
      case 'cre':
        return <CREDashboard />;
      case 'marketing_lead':
        return <MarketingLeadDashboard />;
    }
  }

  return (
    <div className="min-h-screen">
      <TopBar title="ASE Technologies — Marketing Team" subtitle="Manage and view all marketing teams" />
      <div className="space-y-4 p-3 sm:p-4 md:p-6">

      {/* Admin: Show Dashboard + Research Data + Leads + Tasks tabs */}
      {isAdmin && (
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 sm:max-w-2xl gap-1">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Dashboard</TabsTrigger>
            <TabsTrigger value="research-data" className="text-xs sm:text-sm">Research Data (BRE)</TabsTrigger>
            <TabsTrigger value="leads" className="text-xs sm:text-sm">Leads</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs sm:text-sm">Tasks (CRE)</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-4 sm:mt-6">
            <MarketingLeadDashboard dashboardOnly={true} />
          </TabsContent>
          <TabsContent value="research-data" className="mt-4 sm:mt-6">
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-700">📋 Marketing Team - BRE (Business Research Executive)</p>
              <p className="text-xs text-blue-600 mt-1">
                Team Members: {breMembers.length > 0 ? breMembers.join(', ') : 'No members'}
              </p>
            </div>
            <BREDashboard forceResearchView={true} hideTopBar={true} />
          </TabsContent>
          <TabsContent value="leads" className="mt-4 sm:mt-6">
            <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm font-semibold text-purple-700">📞 Marketing Team - BOE (Business Outreach Executive)</p>
              <p className="text-xs text-purple-600 mt-1">
                Team Members: {boeMembers.length > 0 ? boeMembers.join(', ') : 'No members'}
              </p>
            </div>
            <BOELeadsAdmin hideTopBar={true} />
          </TabsContent>
          <TabsContent value="tasks" className="mt-4 sm:mt-6">
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-700">🤝 Marketing Team - CRE (Client Relationship Executive)</p>
              <p className="text-xs text-green-600 mt-1">
                Team Members: {creMembers.length > 0 ? creMembers.join(', ') : 'No members'}
              </p>
            </div>
            <TaskList title="All Tasks" showFilters={true} />
          </TabsContent>
        </Tabs>
      )}
      </div>
    </div>
  );
}
