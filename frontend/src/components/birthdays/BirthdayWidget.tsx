import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gift, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { birthdayService, Birthday } from '@/services/birthday.service';
import { cn } from '@/lib/utils';

import { logger } from '@/lib/logger';
interface BirthdayWidgetProps {
  className?: string;
  showUpcoming?: boolean;
  maxItems?: number;
}

export default function BirthdayWidget({ 
  className, 
  showUpcoming = true, 
  maxItems = 5 
}: BirthdayWidgetProps) {
  const [todayBirthdays, setTodayBirthdays] = useState<Birthday[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBirthdays = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [todayData, upcomingData] = await Promise.all([
        birthdayService.getTodayBirthdays(),
        showUpcoming ? birthdayService.getUpcomingBirthdays() : Promise.resolve([])
      ]);
      
      setTodayBirthdays(todayData);
      setUpcomingBirthdays(upcomingData.slice(0, maxItems));
    } catch (error: any) {
      logger.error('Error fetching birthdays:', error);
      setError('Failed to load birthdays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBirthdays();
  }, [showUpcoming, maxItems]);

  const getBirthdayBadgeColor = (daysUntil: number) => {
    if (daysUntil === 0) return 'bg-green-100 text-green-700 border-green-300';
    if (daysUntil <= 7) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (daysUntil <= 30) return 'bg-blue-100 text-blue-700 border-blue-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  if (loading) {
    return (
      <Card className={cn("glass-card", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="w-5 h-5 text-primary" />
            Birthdays
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading birthdays...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("glass-card", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="w-5 h-5 text-primary" />
            Birthdays
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-red-600">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchBirthdays}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasBirthdays = todayBirthdays.length > 0 || upcomingBirthdays.length > 0;

  return (
    <Card className={cn("glass-card", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="w-5 h-5 text-primary" />
          Birthdays
          {todayBirthdays.length > 0 && (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              {todayBirthdays.length} today
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasBirthdays ? (
          <div className="text-center py-8">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No upcoming birthdays
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Today's Birthdays */}
            {todayBirthdays.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-green-600" />
                  Today's Birthdays
                </h4>
                <div className="space-y-2">
                  {todayBirthdays.map((birthday) => (
                    <div 
                      key={birthday.id}
                      className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-green-900 truncate">
                          🎉 {birthday.employee_name}
                        </p>
                        <p className="text-xs text-green-700">
                          {birthday.employee_role} • {birthday.employee_company}
                          {birthday.show_age && birthday.age && (
                            <span> • {birthday.age} years old</span>
                          )}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-700 border-green-300 ml-2">
                        Today!
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Birthdays */}
            {showUpcoming && upcomingBirthdays.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Upcoming Birthdays
                </h4>
                <div className="space-y-2">
                  {upcomingBirthdays.map((birthday) => (
                    <div 
                      key={birthday.id}
                      className="flex items-center justify-between p-2 hover:bg-accent/50 rounded-lg transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {birthday.employee_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {birthday.employee_role} • {birthday.employee_company}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(birthday.next_birthday), 'MMM dd')}
                          {birthday.show_age && birthday.age && (
                            <span> • Turning {birthday.age + 1}</span>
                          )}
                        </p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs ml-2",
                          getBirthdayBadgeColor(birthday.days_until_birthday)
                        )}
                      >
                        {birthday.days_until_birthday === 1 
                          ? 'Tomorrow' 
                          : `${birthday.days_until_birthday} days`
                        }
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View All Button */}
            <div className="pt-2 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between text-muted-foreground hover:text-foreground"
                onClick={() => {
                  // Navigate to birthday calendar page
                  // This would be implemented based on your routing setup
                  logger.log('Navigate to birthday calendar');
                }}
              >
                View All Birthdays
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}