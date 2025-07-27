import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';

const PayoutAnalytics: React.FC = () => {
  const { machines = [], venues = [] } = useAppContext();

  // Mock data for demonstration
  const totalPayouts = 1250.75;
  const monthlyPayouts = 850.25;
  const averagePerMachine = machines.length > 0 ? totalPayouts / machines.length : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Payout Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPayouts.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyPayouts.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Machine</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averagePerMachine.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Average payout</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Machine Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {machines.map((machine, index) => (
              <div key={machine.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{machine.name}</h4>
                  <p className="text-sm text-gray-600">{machine.venue?.name || 'No venue'}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${(Math.random() * 200 + 50).toFixed(2)}</p>
                  <p className="text-sm text-gray-600">This month</p>
                </div>
              </div>
            ))}
            {machines.length === 0 && (
              <p className="text-gray-500 text-center py-4">No machines to display</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayoutAnalytics;