import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string | null;
  role: 'manager' | 'employee';
}

interface Lead {
  id: string;
  createdBy: string;
  status: string;
  createdAt: Date;
}

interface Task {
  id: string;
  assignedTo: string;
  status: string;
  createdAt: Date;
}

interface EmployeePerformanceRankingProps {
  users: User[];
  tasks: Task[];
}

interface PerformanceData {
  userId: string;
  userName: string;
  completedTasks: number;
  totalScore: number;
  rank: number;
}

export default function EmployeePerformanceRanking({ 
  users, 
  tasks 
}: EmployeePerformanceRankingProps) {
  
  const performanceData = useMemo(() => {
    const userPerformance: PerformanceData[] = users.map(user => {
      const completedTasks = tasks.filter(task => 
        task.assignedTo === user.id && task.status === 'completed'
      ).length;
      
      // Performance score: 5 points per completed task
      const totalScore = completedTasks * 5;
      
      return {
        userId: user.id,
        userName: user.name,
        completedTasks,
        totalScore,
        rank: 0
      };
    });
    
    return userPerformance
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((user, index) => ({ ...user, rank: index + 1 }));
  }, [users, tasks]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Award className="w-4 h-4 text-amber-600" />;
    return <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-muted-foreground">#{rank}</span>;
  };

  if (performanceData.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Employee Performance Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No employee data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Employee Performance Ranking
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ranked by completed tasks (5 points each)
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {performanceData.slice(0, 10).map((employee) => (
            <div
              key={employee.userId}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-muted/50",
                employee.rank === 1 && "bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20",
                employee.rank === 2 && "bg-gray-50 border border-gray-200 dark:bg-gray-950/20",
                employee.rank === 3 && "bg-amber-50 border border-amber-200 dark:bg-amber-950/20"
              )}
            >
              <div className="flex items-center gap-3">
                {getRankIcon(employee.rank)}
                <div>
                  <p className="font-medium text-sm">{employee.userName}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Completed Tasks: {employee.completedTasks}</span>
                  </div>
                </div>
              </div>
              
              <Badge 
                variant={employee.rank <= 3 ? "default" : "outline"} 
                className="text-xs font-bold"
              >
                {employee.totalScore}
              </Badge>
            </div>
          ))}
          
          {performanceData.length > 10 && (
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                +{performanceData.length - 10} more employees
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}