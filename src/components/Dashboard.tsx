import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Gamepad2, Gift, FileText, Package, AlertTriangle, Plus, BarChart3 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { venues = [], machines = [], prizes = [], setCurrentView } = useAppContext();
  const navigate = useNavigate();

  const totalStock = prizes.reduce((sum, prize) => sum + (prize.stock_quantity || 0), 0);
  const totalPrizeValue = prizes.reduce((sum, prize) => sum + (prize.cost * (prize.stock_quantity || 0)), 0);

  const handleReportsClick = () => {
    navigate('/reports');
  };

  const handleCreateReportClick = () => {
    setCurrentView('machine-reports');
  };

  const handlePayoutIssuesClick = () => {
    navigate('/payout-issues');
  };

  const handleStockAnalyticsClick = () => {
    setCurrentView('analytics');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <div className="flex gap-2">
          <Button onClick={handleCreateReportClick} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4" />
            Create Report
          </Button>
          <Button onClick={handleReportsClick} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            View Reports
          </Button>
          <Button onClick={handleStockAnalyticsClick} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
            <BarChart3 className="h-4 w-4" />
            Stock Analytics
          </Button>
          <Button onClick={handlePayoutIssuesClick} variant="outline" className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            Check Payout Issues
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Venues</CardTitle>
            <Building2 className="h-6 w-6" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{venues.length}</div>
            <p className="text-xs opacity-80">+2 this month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Machines</CardTitle>
            <Gamepad2 className="h-6 w-6" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{machines.length}</div>
            <p className="text-xs opacity-80">All operational</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prize Types</CardTitle>
            <Gift className="h-6 w-6" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prizes.length}</div>
            <p className="text-xs opacity-80">{totalStock} total stock</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-6 w-6" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPrizeValue.toFixed(2)}</div>
            <p className="text-xs opacity-80">Current stock value</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Recent Venues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {venues.slice(0, 3).map(venue => (
                <div key={venue.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{venue.name}</h4>
                    <p className="text-sm text-gray-600">{venue.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{venue.commission_percentage}% commission</p>
                  </div>
                </div>
              ))}
              {venues.length === 0 && (
                <p className="text-gray-500 text-center py-4">No venues added yet</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Machine Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {machines.slice(0, 3).map(machine => (
                <div key={machine.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{machine.name}</h4>
                    <p className="text-sm text-gray-600">{machine.type}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                    <p className="text-sm text-gray-600 mt-1">{machine.venue?.name || 'No venue'}</p>
                  </div>
                </div>
              ))}
              {machines.length === 0 && (
                <p className="text-gray-500 text-center py-4">No machines added yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;