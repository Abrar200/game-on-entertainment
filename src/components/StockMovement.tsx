import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { Package, TrendingUp, TrendingDown } from 'lucide-react';

const StockMovement: React.FC = () => {
  const { prizes = [] } = useAppContext();

  const lowStockItems = prizes.filter(prize => (prize.stock_quantity || 0) < 10);
  const outOfStockItems = prizes.filter(prize => (prize.stock_quantity || 0) === 0);
  const wellStockedItems = prizes.filter(prize => (prize.stock_quantity || 0) >= 10);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Stock Movement</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{outOfStockItems.length}</div>
            <p className="text-xs text-red-600">Items need restocking</p>
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
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">Critical Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {outOfStockItems.concat(lowStockItems).map(prize => (
                <div key={prize.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{prize.name}</h4>
                    <p className="text-sm text-gray-600">${prize.cost} each</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      (prize.stock_quantity || 0) === 0 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {(prize.stock_quantity || 0) === 0 ? 'Out of Stock' : `Low: ${prize.stock_quantity}`}
                    </span>
                  </div>
                </div>
              ))}
              {outOfStockItems.length === 0 && lowStockItems.length === 0 && (
                <p className="text-gray-500 text-center py-4">All items have sufficient stock</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">Stock Summary</CardTitle>
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
                  ${prizes.reduce((sum, prize) => sum + (prize.cost * (prize.stock_quantity || 0)), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StockMovement;