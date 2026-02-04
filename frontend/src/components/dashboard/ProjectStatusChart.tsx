import { useState } from 'react';
import { Project, ProjectStatus } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { X, MapPin, Calendar, Building, Hammer, Clock, CheckCircle2, Pause, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectStatusChartProps {
  projects: Project[];
  title?: string;
}

const statusMap: Record<string, ProjectStatus> = {
  'Pre Launch': 'pre_launch',
  'Launch': 'launch',
  'Under Construction': 'under_construction',
  'Mid Stage': 'mid_stage',
  'Ready to Go': 'ready_to_go',
};

const statusColors: Record<string, string> = {
  'Pre Launch': 'hsl(217, 91%, 60%)',
  'Launch': 'hsl(152, 69%, 31%)',
  'Under Construction': 'hsl(45, 93%, 47%)',
  'Mid Stage': 'hsl(271, 81%, 56%)',
  'Ready to Go': 'hsl(220, 9%, 46%)',
};

const statusGradients: Record<string, string> = {
  'Pre Launch': 'from-blue-500 to-indigo-600',
  'Launch': 'from-emerald-500 to-teal-600',
  'Under Construction': 'from-amber-400 to-orange-500',
  'Mid Stage': 'from-purple-500 to-violet-600',
  'Ready to Go': 'from-gray-500 to-slate-600',
};

const statusIcons: Record<string, React.ElementType> = {
  'Pre Launch': Clock,
  'Launch': Hammer,
  'Under Construction': Building,
  'Mid Stage': Pause,
  'Ready to Go': CheckCircle2,
};

export default function ProjectStatusChart({ projects, title = "Projects Overview" }: ProjectStatusChartProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const projectsByStatus = [
    { name: 'Pre Launch', count: projects.filter(p => p.status === 'pre_launch').length },
    { name: 'Launch', count: projects.filter(p => p.status === 'launch').length },
    { name: 'Under Construction', count: projects.filter(p => p.status === 'under_construction').length },
    { name: 'Mid Stage', count: projects.filter(p => p.status === 'mid_stage').length },
    { name: 'Ready to Go', count: projects.filter(p => p.status === 'ready_to_go').length },
  ].filter(item => item.count > 0);

  const filteredProjects = selectedStatus 
    ? projects.filter(p => p.status === statusMap[selectedStatus])
    : [];

  const totalProjects = projects.length;

  const handleClick = (data: any) => {
    if (selectedStatus === data.name) {
      setSelectedStatus(null);
    } else {
      setSelectedStatus(data.name);
    }
  };

  const formatPrice = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const Icon = statusIcons[data.name];
      const percentage = totalProjects > 0 ? ((data.count / totalProjects) * 100).toFixed(1) : 0;
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-xl">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${statusGradients[data.name]} flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{data.name}</p>
              <p className="text-sm text-muted-foreground">{data.count} projects ({percentage}%)</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-2xl p-6 animate-slide-up relative overflow-hidden" style={{ animationDelay: '150ms' }}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-info/10 to-transparent rounded-full blur-3xl" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-info to-info/70 flex items-center justify-center">
            <Building className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{totalProjects} total projects</p>
          </div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={projectsByStatus} layout="vertical" barCategoryGap="20%">
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              width={80}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'hsl(var(--muted)/0.3)' }} 
              wrapperStyle={{ zIndex: 100 }}
            />
            <Bar 
              dataKey="count" 
              radius={[0, 8, 8, 0]}
              onClick={handleClick}
              className="cursor-pointer"
            >
              {projectsByStatus.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={statusColors[entry.name]}
                  className="cursor-pointer transition-all duration-300 hover:opacity-80"
                  style={{
                    filter: selectedStatus === entry.name ? 'brightness(1.2)' : 'none',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend with icons */}
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {projectsByStatus.map((item) => {
          const Icon = statusIcons[item.name];
          return (
            <button
              key={item.name}
              onClick={() => handleClick(item)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                selectedStatus === item.name 
                  ? 'bg-muted ring-2 ring-primary shadow-lg' 
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${statusGradients[item.name]} flex items-center justify-center`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-foreground">{item.name} ({item.count})</span>
            </button>
          );
        })}
      </div>

      {/* Filtered Details */}
      {selectedStatus && filteredProjects.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-foreground">
              {selectedStatus} Projects ({filteredProjects.length})
            </h4>
            <button
              onClick={() => setSelectedStatus(null)}
              className="p-1 hover:bg-muted rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                  <img 
                    src={project.coverImage} 
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{project.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {project.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {project.type}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-foreground">
                    {formatPrice(project.priceMin)} - {formatPrice(project.priceMax)}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <Calendar className="w-3 h-3" />
                    {project.possessionDate && !isNaN(project.possessionDate.getTime()) ? format(project.possessionDate, 'MMM yyyy') : 'TBD'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
