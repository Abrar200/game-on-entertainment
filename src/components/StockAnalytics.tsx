import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Package, RefreshCw, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import StockPopularityCard from './StockPopularityCard';

interface StockAnalytics {
  prize_id: string;
  prize_name: string;
  weekly_average_revenue: number;
  total_revenue: number;
  machine_count: number;
  report_count: number;
}

const StockAnalytics: React.FC = () => {
  const [stockData, setStockData] = useState<StockAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    calculateStockPopularity();
  }, []);

  const calculateStockPopularity = async () => {
    try {
      setCalculating(true);
      
      const { data, error } = await supabase.functions.invoke('calculate-stock-popularity', {
        body: {}
      });
      
      if (error) throw error;
      
      if (data.success) {
        setStockData(data.data || []);
        toast({ 
          title: 'Success', 
          description: `Analyzed ${data.data?.length || 0} different stock types` 
        });
      } else {
        throw new Error(data.error || 'Failed to calculate stock popularity');
      }
    } catch (error) {
      console.error('Error calculating stock popularity:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to calculate stock popularity', 
        variant: 'destructive' 
      });
    } finally {
      setCalculating(false);
      setLoading(false);
    }
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      <Tabs defaultValue="popularity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="popularity">Stock Popularity Ranking</TabsTrigger>
        </TabsList>

        <TabsContent value="popularity" className="space-y-4">
          {stockData.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stock data available.</p>
                  <p className="text-sm">Make sure you have machine reports with revenue data.</p>
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
      </Tabs>
    </div>
  );
};

export default StockAnalytics;