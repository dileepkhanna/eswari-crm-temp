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
  Code, 
  Smartphone, 
  Palette, 
  Server, 
  TestTube, 
  UserCircle,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Shield,
  Megaphone,
  CalendarDays,
  Gift,
  FileText,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

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
  'Frontend Development': Code,
  'Backend Development': Server,
  'Mobile Development': Smartphone,
  'UI/UX Design': Palette,
  'DevOps': Server,
  'QA/Testing': TestTube,
};

export default function TechnicalTeamPanel() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Fetch technical teams
  useEffect(() => {
    fetchTechnicalTeams();
  }, []);

  const fetchTechnicalTeams = async () => {
    try {
      setLoading(true);
      // Get ASE Technologies company ID (assuming it's 2)
      const response = await apiClient.getTeams({ company: 2, team_type: 'technical' });
      const teamsData = response?.results || response || [];
      setTeams(teamsData);
      
      // Select first team by default
      if (teamsData.length > 0) {
        setSelectedTeam(teamsData[0]);
        fetchTeamMembers(teamsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching technical teams:', error);
      toast.error('Failed to load technical teams');
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
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Technical Team Panel</h1>
          <p className="text-muted-foreground mt-1">
            Manage and view all technical teams at ASE Technologies
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Users className="w-4 h-4 mr-2" />
          {teams.length} Teams
        </Badge>
      </div>

      {/* Quick Access - Common Sections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Access</CardTitle>
          <CardDescription>Common sections for team management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link to="/admin/announcements">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5">
                <Megaphone className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Announcements</span>
              </Button>
            </Link>
            
            <Link to="/admin/leaves">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5">
                <CalendarDays className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Leaves</span>
              </Button>
            </Link>
            
            <Link to="/admin/holidays">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5">
                <Calendar className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Holidays</span>
              </Button>
            </Link>
            
            <Link to="/admin/birthdays">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5">
                <Gift className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Birthdays</span>
              </Button>
            </Link>
            
            <Link to="/admin/settings">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5">
                <Settings className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Settings</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Teams Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => {
          const Icon = teamIcons[team.name] || Code;
          const isSelected = selectedTeam?.id === team.id;
          
          return (
            <Card
              key={team.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'ring-2 ring-primary shadow-lg' : ''
              }`}
              onClick={() => handleTeamSelect(team)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {team.member_count} {team.member_count === 1 ? 'Member' : 'Members'}
                      </CardDescription>
                    </div>
                  </div>
                  {team.is_active && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              {team.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {team.description}
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Selected Team Details */}
      {selectedTeam && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = teamIcons[selectedTeam.name] || Code;
                  return (
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  );
                })()}
                <div>
                  <CardTitle className="text-2xl">{selectedTeam.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {selectedTeam.description || 'No description available'}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-base px-4 py-2">
                {selectedTeam.member_count} {selectedTeam.member_count === 1 ? 'Member' : 'Members'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="members" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="members">Team Members</TabsTrigger>
                <TabsTrigger value="overview">Overview</TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="mt-6">
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No team members found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamMembers.map((member) => (
                      <Card key={member.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex flex-col items-center text-center space-y-3">
                            {/* Avatar */}
                            <Avatar className="w-16 h-16">
                              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>

                            {/* Name and Role Badge */}
                            <div className="space-y-1 w-full">
                              <h3 className="font-semibold text-lg">{member.name}</h3>
                              <Badge 
                                variant="outline" 
                                className={getRoleBadgeColor(member.role)}
                              >
                                {member.role === 'team_lead' ? 'Team Lead' : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                              </Badge>
                            </div>

                            {/* Details */}
                            <div className="w-full space-y-2 text-sm text-muted-foreground">
                              {member.designation && (
                                <div className="flex items-center gap-2">
                                  <Briefcase className="w-4 h-4 shrink-0" />
                                  <span className="truncate">{member.designation}</span>
                                </div>
                              )}
                              {member.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 shrink-0" />
                                  <span className="truncate">{member.email}</span>
                                </div>
                              )}
                              {member.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 shrink-0" />
                                  <span className="truncate">{member.phone}</span>
                                </div>
                              )}
                              {member.joining_date && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 shrink-0" />
                                  <span className="truncate">
                                    Joined {new Date(member.joining_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* User ID */}
                            <div className="w-full pt-2 border-t">
                              <p className="text-xs text-muted-foreground font-mono">
                                ID: {member.user_id}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Team Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Team Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Members</span>
                        <span className="font-semibold text-lg">{teamMembers.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Team Leads</span>
                        <span className="font-semibold text-lg">
                          {teamMembers.filter(m => m.role === 'team_lead').length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Employees</span>
                        <span className="font-semibold text-lg">
                          {teamMembers.filter(m => m.role === 'employee').length}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Team Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Team Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Team Name</span>
                        <p className="font-medium mt-1">{selectedTeam.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Team Type</span>
                        <p className="font-medium mt-1 capitalize">{selectedTeam.team_type}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Status</span>
                        <div className="mt-1">
                          <Badge 
                            variant="outline" 
                            className={selectedTeam.is_active 
                              ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                              : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                            }
                          >
                            {selectedTeam.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Team Description */}
                {selectedTeam.description && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{selectedTeam.description}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
