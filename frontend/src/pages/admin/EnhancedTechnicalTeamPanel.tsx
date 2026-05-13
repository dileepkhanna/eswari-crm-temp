import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextDjango';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  FolderKanban,
  ListTodo,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Edit,
  Trash2,
  MoreVertical,
  Calendar as CalendarIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Phase 1 MVP: Enhanced Technical Team Panel
// Features: Dashboard, Projects, Kanban Board, Team Members, Quick Actions

interface DashboardStats {
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  in_progress: number;
  completed: number;
}

interface TechProject {
  id: number;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed';
  team: number;
  team_name: string;
  start_date: string;
  end_date: string;
  progress: number;
  task_count: number;
  created_at: string;
}

interface TechTask {
  id: number;
  title: string;
  description: string;
  task_type: 'feature' | 'bug' | 'improvement' | 'documentation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  project: number | null;
  assignee: number | null;
  assignee_detail?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  story_points: number | null;
  due_date: string | null;
  tags: string[];
  created_at: string;
}

interface TeamMember {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export default function EnhancedTechnicalTeamPanel() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Projects state
  const [projects, setProjects] = useState<TechProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<TechProject | null>(null);
  
  // Tasks state
  const [tasks, setTasks] = useState<TechTask[]>([]);
  const [kanbanData, setKanbanData] = useState<Record<string, TechTask[]>>({});
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<TechTask | null>(null);
  
  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'projects') {
      fetchProjects();
    } else if (activeTab === 'kanban') {
      fetchKanbanBoard();
    } else if (activeTab === 'team') {
      fetchTeamMembers();
    }
  }, [activeTab]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const [projectStats, taskStats] = await Promise.all([
        apiClient.getTechProjectStatistics(),
        apiClient.getTechTaskStatistics()
      ]);
      
      setStats({
        total_projects: projectStats.total_projects || 0,
        active_projects: projectStats.active_projects || 0,
        total_tasks: taskStats.total_tasks || 0,
        in_progress: taskStats.in_progress || 0,
        completed: taskStats.completed || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setProjectsLoading(true);
      const data = await apiClient.getTechProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchKanbanBoard = async () => {
    try {
      setTasksLoading(true);
      const data = await apiClient.getTechKanbanBoard();
      setKanbanData(data);
    } catch (error) {
      console.error('Error fetching kanban board:', error);
      toast.error('Failed to load kanban board');
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      setTeamLoading(true);
      // Fetch users from the same team
      const users = await apiClient.getUsers({ company: user?.company?.id });
      const teamUsers = users.filter((u: any) => u.team === user?.team);
      setTeamMembers(teamUsers);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setShowProjectDialog(true);
  };

  const handleEditProject = (project: TechProject) => {
    setEditingProject(project);
    setShowProjectDialog(true);
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await apiClient.deleteTechProject(projectId);
      toast.success('Project deleted successfully');
      fetchProjects();
      fetchDashboardStats();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskDialog(true);
  };

  const handleMoveTask = async (taskId: number, newStatus: string) => {
    try {
      await apiClient.moveTechTask(taskId, newStatus);
      toast.success('Task moved successfully');
      fetchKanbanBoard();
      fetchDashboardStats();
    } catch (error) {
      console.error('Error moving task:', error);
      toast.error('Failed to move task');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'bg-gray-500',
      active: 'bg-green-500',
      on_hold: 'bg-yellow-500',
      completed: 'bg-blue-500',
      backlog: 'bg-gray-400',
      todo: 'bg-blue-400',
      in_progress: 'bg-orange-500',
      review: 'bg-purple-500',
      done: 'bg-green-600'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    };
    return colors[priority] || 'text-gray-600';
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
          <h1 className="text-3xl font-bold tracking-tight">Technical Team Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage projects, tasks, and collaborate with your team
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateProject}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
          <Button onClick={handleCreateTask} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats?.total_projects || 0}</div>
              <FolderKanban className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats?.active_projects || 0}</div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats?.total_tasks || 0}</div>
              <ListTodo className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats?.in_progress || 0}</div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats?.completed || 0}</div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Technical Team Dashboard</CardTitle>
              <CardDescription>
                Phase 1 MVP is now live! Explore projects, manage tasks, and collaborate with your team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Dashboard Statistics</h4>
                    <p className="text-sm text-muted-foreground">
                      View real-time statistics for projects and tasks
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Project Management</h4>
                    <p className="text-sm text-muted-foreground">
                      Create and manage technical projects with your team
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Kanban Board</h4>
                    <p className="text-sm text-muted-foreground">
                      Visualize and manage tasks with drag-and-drop functionality
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Team Collaboration</h4>
                    <p className="text-sm text-muted-foreground">
                      View team members and their assignments
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Projects</CardTitle>
                  <CardDescription>Manage your technical projects</CardDescription>
                </div>
                <Button onClick={handleCreateProject}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderKanban className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first project to get started
                  </p>
                  <Button onClick={handleCreateProject}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <Card key={project.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <Badge className={`mt-2 ${getStatusColor(project.status)}`}>
                              {project.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProject(project)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProject(project.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {project.description}
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tasks:</span>
                            <span className="font-medium">{project.task_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Progress:</span>
                            <span className="font-medium">{project.progress}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Start Date:</span>
                            <span className="font-medium">
                              {format(new Date(project.start_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kanban Board</CardTitle>
                  <CardDescription>Visualize and manage your tasks</CardDescription>
                </div>
                <Button onClick={handleCreateTask}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {['backlog', 'todo', 'in_progress', 'review', 'done'].map((status) => (
                    <div key={status} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold capitalize">
                          {status.replace('_', ' ')}
                        </h3>
                        <Badge variant="secondary">
                          {kanbanData[status]?.length || 0}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {kanbanData[status]?.map((task) => (
                          <Card key={task.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium text-sm">{task.title}</h4>
                                <Badge className={getPriorityColor(task.priority)} variant="outline">
                                  {task.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {task.description}
                              </p>
                              {task.assignee_detail && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Users className="w-3 h-3" />
                                  <span>
                                    {task.assignee_detail.first_name} {task.assignee_detail.last_name}
                                  </span>
                                </div>
                              )}
                              {task.due_date && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <CalendarIcon className="w-3 h-3" />
                                  <span>{format(new Date(task.due_date), 'MMM dd')}</span>
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>View and manage your team</CardDescription>
            </CardHeader>
            <CardContent>
              {teamLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Team Members</h3>
                  <p className="text-muted-foreground">
                    Team members will appear here once they join
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamMembers.map((member) => (
                    <Card key={member.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">
                            {member.first_name} {member.last_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          <Badge variant="outline" className="mt-1">
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Project Dialog - Placeholder for now */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </DialogTitle>
            <DialogDescription>
              Project creation form will be implemented here
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.info('Project form coming soon!');
              setShowProjectDialog(false);
            }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog - Placeholder for now */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>
            <DialogDescription>
              Task creation form will be implemented here
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.info('Task form coming soon!');
              setShowTaskDialog(false);
            }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
