import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Package, RefreshCw, BarChart3, Calendar, Trophy, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';

interface PerformanceData {
  id: string;
  name: string;
  type: 'machine' | 'prize';
  total_revenue: number;
  average_daily_revenue: number;
  total_reports: number;
  days_active: number;
  performance_score: number;
  venue_name?: string;
  stock_quantity?: number;
  cost?: number;
  toys_dispensed?: number;
  machines_used?: number;
}

interface DateRangeStats {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalReports: number;
  topPerformers: PerformanceData[];
}

const StockAnalytics: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0] // today
  });
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const { toast } = useToast();
  const { prizes, machines, venues } = useAppContext();

  useEffect(() => {
    calculatePerformanceAnalytics();
  }, [dateRange]);

  useEffect(() => {
    // Update date range when period changes
    const today = new Date();
    const daysAgo = new Date(today.getTime() - parseInt(selectedPeriod) * 24 * 60 * 60 * 1000);
    
    setDateRange({
      start: daysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    });
  }, [selectedPeriod]);

  const calculatePerformanceAnalytics = async () => {
    try {
      setCalculating(true);
      setLoading(true);

      console.log('📊 Calculating performance analytics for date range:', dateRange);

      // Get all reports within date range
      const { data: reports, error: reportsError } = await supabase
        .from('machine_reports')
        .select(`
          *,
          machines!inner(
            id,
            name,
            type,
            venue_id,
            venues(name)
          )
        `)
        .gte('report_date', dateRange.start)
        .lte('report_date', dateRange.end)
        .order('report_date', { ascending: false });

      if (reportsError) {
        console.error('Reports error:', reportsError);
        throw reportsError;
      }

      console.log('📈 Found reports in date range:', reports?.length || 0);

      // Calculate machine performance
      const machinePerformance = new Map<string, {
        machine: any;
        totalRevenue: number;
        reportCount: number;
        totalToys: number;
        uniqueDates: Set<string>;
      }>();

      reports?.forEach(report => {
        const machine = report.machines;
        if (!machine) return;

        const machineId = machine.id;
        const revenue = report.money_collected || 0;
        const toys = report.toys_dispensed || 0;
        const reportDate = report.report_date;

        if (!machinePerformance.has(machineId)) {
          machinePerformance.set(machineId, {
            machine,
            totalRevenue: 0,
            reportCount: 0,
            totalToys: 0,
            uniqueDates: new Set()
          });
        }

        const data = machinePerformance.get(machineId)!;
        data.totalRevenue += revenue;
        data.reportCount += 1;
        data.totalToys += toys;
        data.uniqueDates.add(reportDate);
      });

      // Calculate prize performance from machine stock movements
      const { data: stockMovements, error: stockError } = await supabase
        .from('machine_stock')
        .select(`
          *,
          prizes(id, name, cost),
          machines!inner(
            id,
            name,
            venues(name)
          )
        `);

      if (stockError) {
        console.error('Stock error:', stockError);
      }

      const prizePerformance = new Map<string, {
        prize: any;
        totalRevenue: number;
        machinesUsed: Set<string>;
        toysDispensed: number;
      }>();

      // Calculate prize performance based on machine reports and prize assignments
      reports?.forEach(report => {
        const machine = report.machines;
        if (!machine) return;

        // Find current prize for this machine
        const machineStock = stockMovements?.find(stock => 
          stock.machine_id === machine.id
        );

        if (machineStock?.prizes) {
          const prize = machineStock.prizes;
          const prizeId = prize.id;
          const toys = report.toys_dispensed || 0;
          const prizeValue = toys * (prize.cost || 0);

          if (!prizePerformance.has(prizeId)) {
            prizePerformance.set(prizeId, {
              prize,
              totalRevenue: 0,
              machinesUsed: new Set(),
              toysDispensed: 0
            });
          }

          const data = prizePerformance.get(prizeId)!;
          data.totalRevenue += prizeValue;
          data.machinesUsed.add(machine.id);
          data.toysDispensed += toys;
        }
      });

      // Convert to performance data array
      const allPerformanceData: PerformanceData[] = [];

      // Add machine performance
      machinePerformance.forEach((data, machineId) => {
        const machine = data.machine;
        const venue = venues.find(v => v.id === machine.venue_id);
        const daysActive = Math.max(1, data.uniqueDates.size);
        const averageDailyRevenue = data.totalRevenue / daysActive;
        const performanceScore = averageDailyRevenue * Math.log(data.reportCount + 1);

        allPerformanceData.push({
          id: machineId,
          name: machine.name,
          type: 'machine',
          total_revenue: data.totalRevenue,
          average_daily_revenue: averageDailyRevenue,
          total_reports: data.reportCount,
          days_active: daysActive,
          performance_score: performanceScore,
          venue_name: venue?.name,
          toys_dispensed: data.totalToys
        });
      });

      // Add prize performance
      prizePerformance.forEach((data, prizeId) => {
        const prize = data.prize;
        const daysInPeriod = Math.max(1, 
          (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)
        );
        const averageDailyRevenue = data.totalRevenue / daysInPeriod;
        const performanceScore = averageDailyRevenue * Math.log(data.machinesUsed.size + 1);

        allPerformanceData.push({
          id: prizeId,
          name: prize.name,
          type: 'prize',
          total_revenue: data.totalRevenue,
          average_daily_revenue: averageDailyRevenue,
          total_reports: 0,
          days_active: daysInPeriod,
          performance_score: performanceScore,
          stock_quantity: prize.stock_quantity,
          cost: prize.cost,
          toys_dispensed: data.toysDispensed,
          machines_used: data.machinesUsed.size
        });
      });

      // Sort by performance score
      allPerformanceData.sort((a, b) => b.performance_score - a.performance_score);

      console.log('📊 Calculated performance for:', allPerformanceData.length, 'items');
      setPerformanceData(allPerformanceData);

      toast({
        title: 'Success',
        description: `Analyzed performance for ${allPerformanceData.length} items`
      });

    } catch (error) {
      console.error('Error calculating performance analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate performance analytics',
        variant: 'destructive'
      });
    } finally {
      setCalculating(false);
      setLoading(false);
    }
  };

  const topMachines = performanceData
    .filter(item => item.type === 'machine')
    .slice(0, 10);

  const topPrizes = performanceData
    .filter(item => item.type === 'prize')
    .slice(0, 10);

  const totalRevenue = performanceData.reduce((sum, item) => sum + item.total_revenue, 0);
  const averagePerformance = performanceData.length > 0 
    ? performanceData.reduce((sum, item) => sum + item.performance_score, 0) / performanceData.length 
    : 0;

  if (loading && !calculating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Performance Analytics</h1>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading performance analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Performance Analytics</h1>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={calculatePerformanceAnalytics} disabled={calculating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
            {calculating ? 'Calculating...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Custom Date Range */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Analysis Period: {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="w-40"
              />
            </div>
            <Button 
              onClick={calculatePerformanceAnalytics}
              disabled={calculating}
              className="mt-6"
            >
              Apply Range
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.length}</div>
            <p className="text-xs text-muted-foreground">Machines & prizes analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averagePerformance.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Weighted by activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Best Machine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {topMachines[0]?.name.slice(0, 12) || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              ${topMachines[0]?.average_daily_revenue.toFixed(0) || '0'}/day avg
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="machines" className="space-y-4">
        <TabsList>
          <TabsTrigger value="machines">Top Machines</TabsTrigger>
          <TabsTrigger value="prizes">Top Prizes</TabsTrigger>
          <TabsTrigger value="venues">Venue Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="machines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Performing Machines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topMachines.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No machine performance data available for this period.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topMachines.map((machine, index) => (
                    <div key={machine.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold">{machine.name}</h3>
                          <p className="text-sm text-gray-600">{machine.venue_name}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            <span>{machine.total_reports} reports</span>
                            <span>{machine.days_active} active days</span>
                            {machine.toys_dispensed && <span>{machine.toys_dispensed} toys dispensed</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          ${machine.total_revenue.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">
                          ${machine.average_daily_revenue.toFixed(2)}/day
                        </div>
                        <Badge variant="outline" className="mt-1">
                          Score: {machine.performance_score.toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prizes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-500" />
                Top Performing Prizes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topPrizes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No prize performance data available for this period.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topPrizes.map((prize, index) => (
                    <div key={prize.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-purple-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold">{prize.name}</h3>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            <span>Cost: ${prize.cost?.toFixed(2) || '0.00'}</span>
                            <span>Stock: {prize.stock_quantity || 0}</span>
                            <span>{prize.machines_used} machines</span>
                            {prize.toys_dispensed && <span>{prize.toys_dispensed} dispensed</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-purple-600">
                          ${prize.total_revenue.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">
                          ${prize.average_daily_revenue.toFixed(2)}/day
                        </div>
                        <Badge variant="outline" className="mt-1">
                          Score: {prize.performance_score.toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="venues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Venue Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const venuePerformance = venues.map(venue => {
                  const venueMachines = topMachines.filter(m => m.venue_name === venue.name);
                  const totalRevenue = venueMachines.reduce((sum, m) => sum + m.total_revenue, 0);
                  const averageDaily = venueMachines.reduce((sum, m) => sum + m.average_daily_revenue, 0);
                  const commission = totalRevenue * (venue.commission_percentage / 100);
                  
                  return {
                    venue,
                    machineCount: venueMachines.length,
                    totalRevenue,
                    averageDaily,
                    commission,
                    performanceScore: averageDaily * Math.log(venueMachines.length + 1)
                  };
                }).sort((a, b) => b.totalRevenue - a.totalRevenue);

                return venuePerformance.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No venue performance data available for this period.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {venuePerformance.map((venue, index) => (
                      <div key={venue.venue.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-green-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold">{venue.venue.name}</h3>
                            <p className="text-sm text-gray-600">{venue.venue.address}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                              <span>{venue.machineCount} active machines</span>
                              <span>{venue.venue.commission_percentage}% commission</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            ${venue.totalRevenue.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-600">
                            ${venue.averageDaily.toFixed(2)}/day total
                          </div>
                          <div className="text-sm font-medium text-orange-600">
                            Commission: ${venue.commission.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topMachines.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">🏆 Top Performer</h4>
                <p className="text-green-700">
                  <strong>{topMachines[0].name}</strong> at {topMachines[0].venue_name} is your best performing machine, 
                  generating ${topMachines[0].average_daily_revenue.toFixed(2)} per day on average.
                </p>
              </div>
            )}
            
            {topPrizes.length > 0 && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">🎁 Most Popular Prize</h4>
                <p className="text-purple-700">
                  <strong>{topPrizes[0].name}</strong> is generating the highest prize revenue, 
                  worth ${topPrizes[0].average_daily_revenue.toFixed(2)} per day.
                </p>
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📊 Analysis Notes</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Performance scores weight daily revenue by activity level</li>
                <li>• Prize revenue is calculated from toys dispensed × prize cost</li>
                <li>• Machine performance includes all cash/paywave collected</li>
                <li>• Use longer time periods for more reliable trend analysis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockAnalytics;