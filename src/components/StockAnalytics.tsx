import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Package, RefreshCw, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import StockPopularityCard from './StockPopularityCard';

interface StockAnalytics {
  prize_id: string;
  prize_name: string;
  weekly_average_revenue: number;
  total_revenue: number;
  machine_count: number;
  report_count: number;
  toys_dispensed: number;
  average_prize_cost: number;
}

const StockAnalytics: React.FC = () => {
  const [stockData, setStockData] = useState<StockAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();
  const { prizes } = useAppContext();

  useEffect(() => {
    calculateStockPopularity();
  }, []);

  const calculateStockPopularity = async () => {
    try {
      setCalculating(true);
      setLoading(true);

      // Get all reports with machine and prize data
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select(`
          *,
          machines!inner(
            id,
            name,
            current_prize_id,
            prizes(id, name, cost, cost_price)
          )
        `)
        .order('report_date', { ascending: false });

      if (reportsError) {
        console.error('Reports error:', reportsError);
        throw reportsError;
      }

      // Get machine stock data to know which prizes are in which machines
      const { data: machineStock, error: stockError } = await supabase
        .from('machine_stock')
        .select(`
          machine_id,
          prize_id,
          quantity,
          created_at,
          prizes(id, name, cost, cost_price)
        `);

      if (stockError) {
        console.error('Stock error:', stockError);
        throw stockError;
      }

      // Also try machine_reports table if reports is empty
      let machineReports = [];
      if (!reports || reports.length === 0) {
        const { data: mReports, error: mReportsError } = await supabase
          .from('machine_reports')
          .select('*')
          .order('report_date', { ascending: false });

        if (!mReportsError && mReports) {
          machineReports = mReports;
        }
      }

      const allReports = [...(reports || []), ...machineReports];
      console.log('Found reports:', allReports.length);
      console.log('Found machine stock entries:', machineStock?.length || 0);

      // Calculate analytics for each prize
      const prizeAnalytics = new Map<string, StockAnalytics>();

      // Process reports data
      allReports.forEach(report => {
        const machine = report.machines || {};
        let prize = null;

        // Handle nested prize data from machines
        if (machine.prizes) {
          // If prizes is an array, take the first element
          if (Array.isArray(machine.prizes)) {
            prize = machine.prizes.length > 0 ? machine.prizes[0] : null;
          } else {
            // If prizes is an object, use it directly
            prize = machine.prizes;
          }
        }

        // Fallback: find prize from AppContext
        if (!prize && machine.current_prize_id) {
          prize = prizes.find(p => p.id === machine.current_prize_id);
        }

        // Try to find prize from machine stock for this machine
        if (!prize) {
          const stockEntry = machineStock?.find(s => s.machine_id === report.machine_id);
          if (stockEntry?.prizes) {
            prize = Array.isArray(stockEntry.prizes) ? stockEntry.prizes[0] : stockEntry.prizes;
          }
        }

        if (prize && prize.id && prize.name) {
          processPrizeReport(prize, report, prizeAnalytics);
        }
      });

      // Process machine stock data for prizes that might not be in reports yet
      machineStock?.forEach(stock => {
        let prize = null;

        // Handle nested prize data from stock
        if (stock.prizes) {
          // If prizes is an array, take the first element
          if (Array.isArray(stock.prizes)) {
            prize = stock.prizes.length > 0 ? stock.prizes[0] : null;
          } else {
            // If prizes is an object, use it directly
            prize = stock.prizes;
          }
        }

        if (prize && prize.id && prize.name && !prizeAnalytics.has(prize.id)) {
          prizeAnalytics.set(prize.id, {
            prize_id: prize.id,
            prize_name: prize.name,
            weekly_average_revenue: 0,
            total_revenue: 0,
            machine_count: 1,
            report_count: 0,
            toys_dispensed: 0,
            average_prize_cost: prize.cost || prize.cost_price || 0
          });
        }
      });

      // If we still don't have data, use prizes directly
      if (prizeAnalytics.size === 0) {
        prizes.forEach(prize => {
          prizeAnalytics.set(prize.id, {
            prize_id: prize.id,
            prize_name: prize.name,
            weekly_average_revenue: 0,
            total_revenue: 0,
            machine_count: 0,
            report_count: 0,
            toys_dispensed: 0,
            average_prize_cost: prize.cost || 0
          });
        });
      }

      // Convert to array and sort by weekly average revenue
      const analyticsArray = Array.from(prizeAnalytics.values())
        .sort((a, b) => b.weekly_average_revenue - a.weekly_average_revenue);

      console.log('Calculated analytics for prizes:', analyticsArray.length);
      setStockData(analyticsArray);

      toast({
        title: 'Success',
        description: `Analyzed ${analyticsArray.length} different stock types`
      });

    } catch (error) {
      console.error('Error calculating stock popularity:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate stock popularity',
        variant: 'destructive'
      });

      // Fallback: show basic prize data
      const fallbackData = prizes.map(prize => ({
        prize_id: prize.id,
        prize_name: prize.name,
        weekly_average_revenue: 0,
        total_revenue: 0,
        machine_count: 0,
        report_count: 0,
        toys_dispensed: 0,
        average_prize_cost: prize.cost || 0
      }));
      setStockData(fallbackData);

    } finally {
      setCalculating(false);
      setLoading(false);
    }
  };

  const processPrizeReport = (prize: any, report: any, analytics: Map<string, StockAnalytics>) => {
    // Ensure we have valid prize data
    if (!prize || !prize.id || !prize.name) {
      return;
    }

    const prizeId = prize.id;
    const prizeCost = prize.cost || prize.cost_price || 0;
    const revenue = report.revenue || report.money_collected || 0;
    const toysDispensed = report.toys_dispensed || 0;

    if (!analytics.has(prizeId)) {
      analytics.set(prizeId, {
        prize_id: prizeId,
        prize_name: prize.name,
        weekly_average_revenue: 0,
        total_revenue: 0,
        machine_count: 0,
        report_count: 0,
        toys_dispensed: 0,
        average_prize_cost: prizeCost
      });
    }

    const existing = analytics.get(prizeId)!;
    existing.total_revenue += revenue;
    existing.report_count += 1;
    existing.toys_dispensed += toysDispensed;

    // Calculate weekly average (assuming reports are roughly weekly)
    existing.weekly_average_revenue = existing.report_count > 0
      ? existing.total_revenue / existing.report_count
      : 0;

    // Count unique machines (simplified)
    existing.machine_count = Math.max(existing.machine_count, 1);
  };

  const maxRevenue = stockData.length > 0 ? Math.max(...stockData.map(s => s.weekly_average_revenue)) : 0;
  const totalStockTypes = stockData.length;
  const totalWeeklyRevenue = stockData.reduce((sum, s) => sum + s.weekly_average_revenue, 0);
  const averageWeeklyRevenue = totalStockTypes > 0 ? totalWeeklyRevenue / totalStockTypes : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Stock Analytics</h1>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Calculating stock popularity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Stock Analytics</h1>
        </div>
        <Button onClick={calculateStockPopularity} disabled={calculating}>
          <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
          {calculating ? 'Calculating...' : 'Refresh Analytics'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStockTypes}</div>
            <p className="text-xs text-muted-foreground">Different prizes in use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${maxRevenue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Weekly revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Weekly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageWeeklyRevenue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Across all stock types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stockData.reduce((sum, s) => sum + s.report_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Revenue reports analyzed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="popularity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="popularity">Stock Popularity Ranking</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="popularity" className="space-y-4">
          {stockData.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stock data available.</p>
                  <p className="text-sm">Add some prizes and create machine reports to see analytics.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {stockData.map((stock, index) => (
                <StockPopularityCard
                  key={stock.prize_id}
                  prizeId={stock.prize_id}
                  prizeName={stock.prize_name}
                  weeklyAverageRevenue={stock.weekly_average_revenue}
                  totalRevenue={stock.total_revenue}
                  machineCount={stock.machine_count}
                  reportCount={stock.report_count}
                  rank={index + 1}
                  maxRevenue={maxRevenue}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stockData.map((stock, index) => (
              <Card key={stock.prize_id}>
                <CardHeader>
                  <CardTitle className="text-lg">{stock.prize_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Revenue per Report:</span>
                      <div className="font-semibold">
                        ${stock.report_count > 0 ? (stock.total_revenue / stock.report_count).toFixed(2) : '0.00'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Toys Dispensed:</span>
                      <div className="font-semibold">{stock.toys_dispensed}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Prize Cost:</span>
                      <div className="font-semibold">${stock.average_prize_cost.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ROI Ratio:</span>
                      <div className="font-semibold">
                        {stock.average_prize_cost > 0
                          ? (stock.weekly_average_revenue / stock.average_prize_cost).toFixed(1) + 'x'
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StockAnalytics;