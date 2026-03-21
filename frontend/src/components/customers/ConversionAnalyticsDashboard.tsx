import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, Users, Clock, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { logger } from '@/lib/logger';
interface DateRange {
  from: Date;
  to: Date;
}

interface ConversionRateData {
  total_customers: number;
  converted_customers: number;
  conversion_rate: number;
  period: {
    start: string;
    end: string;
  };
}

interface UserConversion {
  user_id: number;
  user_name: string;
  total_customers: number;
  converted: number;
  conversion_rate: number;
}

interface TrendData {
  date: string;
  conversions: number;
}

export function ConversionAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [conversionRate, setConversionRate] = useState<ConversionRateData | null>(null);
  const [topConverters, setTopConverters] = useState<UserConversion[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Fetch all analytics data in parallel
      const [rateData, convertersData, trendDataResponse] = await Promise.all([
        fetchConversionRate(),
        fetchTopConverters(),
        fetchConversionTrend(),
      ]);

      setConversionRate(rateData);
      setTopConverters(convertersData);
      setTrendData(trendDataResponse);
    } catch (error) {
      logger.error('Failed to fetch analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConversionRate = async (): Promise<ConversionRateData> => {
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      const response = await apiClient.getConversionRate(startDate, endDate);
      return response;
    } catch (error) {
      logger.error('Failed to fetch conversion rate:', error);
      return {
        total_customers: 0,
        converted_customers: 0,
        conversion_rate: 0,
        period: {
          start: format(dateRange.from, 'yyyy-MM-dd'),
          end: format(dateRange.to, 'yyyy-MM-dd'),
        },
      };
    }
  };

  const fetchTopConverters = async (): Promise<UserConversion[]> => {
    try {
      const response = await apiClient.getConversionByUser();
      // Sort by conversion count descending
      const sorted = response.users.sort((a: UserConversion, b: UserConversion) => 
        b.converted - a.converted
      );
      // Return top 5 converters
      return sorted.slice(0, 5);
    } catch (error) {
      logger.error('Failed to fetch top converters:', error);
      return [];
    }
  };

  const fetchConversionTrend = async (): Promise<TrendData[]> => {
    try {
      const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      const response = await apiClient.getConversionTrend(days);
      return response.trend || [];
    } catch (error) {
      logger.error('Failed to fetch conversion trend:', error);
      return [];
    }
  };

  const pendingConversions = conversionRate
    ? conversionRate.total_customers - conversionRate.converted_customers
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Conversion Analytics</h2>
          <p className="text-muted-foreground">
            Track customer-to-lead conversion metrics and trends
          </p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full sm:w-[280px] justify-start text-left font-normal',
                !dateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd, y')} -{' '}
                    {format(dateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() =>
                  setDateRange({
                    from: subDays(new Date(), 7),
                    to: new Date(),
                  })
                }
              >
                Last 7 days
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() =>
                  setDateRange({
                    from: subDays(new Date(), 30),
                    to: new Date(),
                  })
                }
              >
                Last 30 days
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() =>
                  setDateRange({
                    from: subDays(new Date(), 90),
                    to: new Date(),
                  })
                }
              >
                Last 90 days
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Metric Cards Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Conversion Rate Card - Will be implemented in 18.2 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversionRate?.conversion_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {conversionRate?.converted_customers} of {conversionRate?.total_customers} customers
              converted
            </p>
          </CardContent>
        </Card>

        {/* Pending Conversions Card - Will be implemented in 18.3 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Conversions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingConversions}</div>
            <p className="text-xs text-muted-foreground">
              Customers awaiting conversion
            </p>
          </CardContent>
        </Card>

        {/* Total Conversions Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversionRate?.converted_customers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Customers converted to leads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Conversion Trend Chart - Will be implemented in 18.5 */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Conversion Trend</CardTitle>
            <CardDescription>Daily conversion counts over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Converters Table - Will be implemented in 18.4 */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Top Converters</CardTitle>
            <CardDescription>Users with highest conversion counts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topConverters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No conversion data available
                </p>
              ) : (
                <div className="space-y-2">
                  {topConverters.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{user.user_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.converted} conversions ({user.conversion_rate.toFixed(1)}% rate)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{user.converted}</p>
                        <p className="text-xs text-muted-foreground">
                          of {user.total_customers}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
