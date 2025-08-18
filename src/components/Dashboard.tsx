import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Cog, Gift, Package, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import MachineProblemsTracker from '@/components/MachineProblemsTracker';

const Dashboard: React.FC = () => {
  const { venues, machines, prizes, parts } = useAppContext();

  // Calculate stats
  const activeMachines = machines.filter(m => m.status === 'active').length;
  const totalPrizes = prizes.reduce((sum, prize) => sum + prize.stock_quantity, 0);
  const totalParts = parts.reduce((sum, part) => sum + part.stock_quantity, 0);
  const lowStockPrizes = prizes.filter(prize => prize.stock_quantity <= 5).length;
  const lowStockParts = parts.filter(part => part.stock_quantity <= part.low_stock_limit).length;

  // Calculate total inventory value
  const prizeValue = prizes.reduce((sum, prize) => sum + (prize.cost * prize.stock_quantity), 0);
  const partValue = parts.reduce((sum, part) => sum + (part.cost_price * part.stock_quantity), 0);
  const totalValue = prizeValue + partValue;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your arcade management system</p>
      </div>

      {/* Machine Problems Alert - Show at top if there are issues */}
      <MachineProblemsTracker />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Venues</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{venues.length}</div>
            <p className="text-xs text-muted-foreground">
              Active locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Machines</CardTitle>
            <Cog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMachines}</div>
            <p className="text-xs text-muted-foreground">
              Out of {machines.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prize Inventory</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPrizes}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {prizes.length} different items
              </p>
              {lowStockPrizes > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {lowStockPrizes} low stock
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parts Inventory</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParts}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {parts.length} different parts
              </p>
              {lowStockParts > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {lowStockParts} low stock
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Prizes: ${prizeValue.toFixed(2)} • Parts: ${partValue.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Machine Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Active:</span>
                <Badge variant="default">{machines.filter(m => m.status === 'active').length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Maintenance:</span>
                <Badge variant="secondary">{machines.filter(m => m.status === 'maintenance').length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Inactive:</span>
                <Badge variant="outline">{machines.filter(m => m.status === 'inactive').length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Low Stock Prizes:</span>
                <Badge variant={lowStockPrizes > 0 ? "destructive" : "default"}>
                  {lowStockPrizes}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Low Stock Parts:</span>
                <Badge variant={lowStockParts > 0 ? "destructive" : "default"}>
                  {lowStockParts}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Alerts:</span>
                <Badge variant={(lowStockPrizes + lowStockParts) > 0 ? "destructive" : "default"}>
                  {lowStockPrizes + lowStockParts}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity or Quick Actions could go here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                <Gift className="h-5 w-5 mb-2 text-purple-600" />
                <div className="font-medium text-sm">Add Prize</div>
                <div className="text-xs text-gray-500">Restock inventory</div>
              </button>
              <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                <Package className="h-5 w-5 mb-2 text-blue-600" />
                <div className="font-medium text-sm">Add Part</div>
                <div className="text-xs text-gray-500">Maintenance stock</div>
              </button>
              <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                <Cog className="h-5 w-5 mb-2 text-green-600" />
                <div className="font-medium text-sm">Add Machine</div>
                <div className="text-xs text-gray-500">Expand fleet</div>
              </button>
              <button className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                <Building2 className="h-5 w-5 mb-2 text-orange-600" />
                <div className="font-medium text-sm">Add Venue</div>
                <div className="text-xs text-gray-500">New location</div>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Machine Uptime</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(activeMachines / Math.max(machines.length, 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {Math.round((activeMachines / Math.max(machines.length, 1)) * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Prize Stock Level</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        lowStockPrizes === 0 ? 'bg-green-600' : 
                        lowStockPrizes <= 3 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ 
                        width: `${Math.max(10, 100 - (lowStockPrizes / Math.max(prizes.length, 1)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {lowStockPrizes === 0 ? 'Good' : `${lowStockPrizes} alerts`}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Parts Stock Level</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        lowStockParts === 0 ? 'bg-green-600' : 
                        lowStockParts <= 3 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ 
                        width: `${Math.max(10, 100 - (lowStockParts / Math.max(parts.length, 1)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {lowStockParts === 0 ? 'Good' : `${lowStockParts} alerts`}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Status</span>
                  <Badge 
                    variant={
                      (lowStockPrizes + lowStockParts === 0 && activeMachines === machines.length) ? 'default' :
                      (lowStockPrizes + lowStockParts <= 2) ? 'secondary' : 'destructive'
                    }
                  >
                    {(lowStockPrizes + lowStockParts === 0 && activeMachines === machines.length) ? 'Excellent' :
                     (lowStockPrizes + lowStockParts <= 2) ? 'Good' : 'Needs Attention'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;