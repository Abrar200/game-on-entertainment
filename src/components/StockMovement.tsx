import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { Package, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, History } from 'lucide-react';

interface StockMovementData {
  id: string;
  item_type: string;
  item_id: string;
  movement_type: string;
  quantity: number;
  reference_type: string;
  reference_id: string;
  notes: string;
  created_at: string;
  prize_name?: string;
}

const StockMovement: React.FC = () => {
  const { prizes = [] } = useAppContext();
  const [stockMovements, setStockMovements] = useState<StockMovementData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStockMovements();
  }, []);

  const loadStockMovements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          prizes(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const movementsWithNames = data?.map(movement => ({
        ...movement,
        prize_name: movement.prizes?.name || 'Unknown Item'
      })) || [];

      setStockMovements(movementsWithNames);
    } catch (error) {
      console.error('Error loading stock movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const lowStockItems = prizes.filter(prize => (prize.stock_quantity || 0) < 10 && (prize.stock_quantity || 0) > 0);
  const outOfStockItems = prizes.filter(prize => (prize.stock_quantity || 0) === 0);
  const wellStockedItems = prizes.filter(prize => (prize.stock_quantity || 0) >= 10);
  const criticalItems = prizes.filter(prize => (prize.stock_quantity || 0) < 5);

  // Calculate recent movements (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentMovements = stockMovements.filter(movement =>
    new Date(movement.created_at) > sevenDaysAgo
  );

  const recentOutbound = recentMovements
    .filter(m => m.movement_type === 'out')
    .reduce((sum, m) => sum + m.quantity, 0);

  const recentInbound = recentMovements
    .filter(m => m.movement_type === 'in')
    .reduce((sum, m) => sum + m.quantity, 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'out': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Package className="h-4 w-4 text-blue-600" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'in': return 'text-green-600 bg-green-50 border-green-200';
      case 'out': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Stock Movement & Analytics</h2>
        <Button onClick={loadStockMovements} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Critical Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{criticalItems.length}</div>
            <p className="text-xs text-red-600">Items below 5 units</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Low Stock</CardTitle>
            <Package className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{lowStockItems.length}</div>
            <p className="text-xs text-yellow-600">Items below 10 units</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Well Stocked</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{wellStockedItems.length}</div>
            <p className="text-xs text-green-600">Items with good stock</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Recent Activity</CardTitle>
            <History className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{recentMovements.length}</div>
            <p className="text-xs text-blue-600">Movements (7 days)</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Stock Alerts</TabsTrigger>
          <TabsTrigger value="movements">Recent Movements</TabsTrigger>
          <TabsTrigger value="summary">Stock Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Critical & Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {outOfStockItems.concat(criticalItems, lowStockItems)
                    .filter((item, index, arr) => arr.findIndex(i => i.id === item.id) === index) // Remove duplicates
                    .map(prize => (
                      <div key={prize.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{prize.name}</h4>
                          <p className="text-sm text-gray-600">${prize.cost?.toFixed(2) || '0.00'} each</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(prize.stock_quantity || 0) === 0
                              ? 'bg-red-100 text-red-800'
                              : (prize.stock_quantity || 0) < 5
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {(prize.stock_quantity || 0) === 0
                              ? 'Out of Stock'
                              : (prize.stock_quantity || 0) < 5
                                ? `Critical: ${prize.stock_quantity}`
                                : `Low: ${prize.stock_quantity}`
                            }
                          </span>
                        </div>
                      </div>
                    ))}
                  {outOfStockItems.length === 0 && criticalItems.length === 0 && lowStockItems.length === 0 && (
                    <p className="text-gray-500 text-center py-4">All items have sufficient stock 🎉</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-700">Recent Activity Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Stock Added (7 days)</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{recentInbound}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="font-medium">Stock Used (7 days)</span>
                    </div>
                    <span className="text-lg font-bold text-red-600">{recentOutbound}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Net Change</span>
                    <span className={`text-lg font-bold ${(recentInbound - recentOutbound) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {recentInbound - recentOutbound >= 0 ? '+' : ''}{recentInbound - recentOutbound}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Stock Movements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stockMovements.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No stock movements recorded yet</p>
                ) : (
                  stockMovements.map(movement => (
                    <div key={movement.id} className={`flex items-center justify-between p-3 rounded-lg border ${getMovementColor(movement.movement_type)}`}>
                      <div className="flex items-center gap-3">
                        {getMovementIcon(movement.movement_type)}
                        <div>
                          <h4 className="font-medium">{movement.prize_name}</h4>
                          <p className="text-sm opacity-75">
                            {movement.reference_type} • {formatDate(movement.created_at)}
                          </p>
                          {movement.notes && (
                            <p className="text-xs opacity-60 mt-1">{movement.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">
                          {movement.movement_type === 'out' ? '-' : '+'}
                          {movement.quantity}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">Inventory Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Total Prize Types</span>
                    <span className="text-lg font-bold">{prizes.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Total Stock Units</span>
                    <span className="text-lg font-bold">
                      {prizes.reduce((sum, prize) => sum + (prize.stock_quantity || 0), 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Total Stock Value</span>
                    <span className="text-lg font-bold">
                      ${prizes.reduce((sum, prize) => sum + ((prize.cost || 0) * (prize.stock_quantity || 0)), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Average Prize Value</span>
                    <span className="text-lg font-bold">
                      ${prizes.length > 0 ? (prizes.reduce((sum, prize) => sum + (prize.cost || 0), 0) / prizes.length).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-700">Stock Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {prizes
                    .sort((a, b) => (b.stock_quantity || 0) - (a.stock_quantity || 0))
                    .slice(0, 10)
                    .map(prize => {
                      const maxStock = Math.max(...prizes.map(p => p.stock_quantity || 0));
                      const percentage = maxStock > 0 ? ((prize.stock_quantity || 0) / maxStock) * 100 : 0;

                      return (
                        <div key={prize.id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium truncate">{prize.name}</span>
                            <span className="text-gray-600">{prize.stock_quantity || 0} units</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  }
                  {prizes.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No prizes available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StockMovement;