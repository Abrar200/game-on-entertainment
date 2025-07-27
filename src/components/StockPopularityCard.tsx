import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Package, DollarSign } from 'lucide-react';

interface StockPopularityCardProps {
  prizeId: string;
  prizeName: string;
  weeklyAverageRevenue: number;
  totalRevenue: number;
  machineCount: number;
  reportCount: number;
  rank: number;
  maxRevenue: number;
}

const StockPopularityCard: React.FC<StockPopularityCardProps> = ({
  prizeId,
  prizeName,
  weeklyAverageRevenue,
  totalRevenue,
  machineCount,
  reportCount,
  rank,
  maxRevenue
}) => {
  const popularityPercentage = maxRevenue > 0 ? (weeklyAverageRevenue / maxRevenue) * 100 : 0;
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500';
    if (rank <= 3) return 'bg-gray-400';
    if (rank <= 5) return 'bg-orange-600';
    return 'bg-gray-300';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full ${getRankColor(rank)} flex items-center justify-center text-white text-sm font-bold`}>
              {rank}
            </div>
            {prizeName}
          </CardTitle>
          <Badge variant={rank <= 3 ? 'default' : 'secondary'}>
            ${weeklyAverageRevenue.toFixed(0)}/week
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Weekly Revenue</span>
          <span>{popularityPercentage.toFixed(1)}% of top performer</span>
        </div>
        <Progress value={popularityPercentage} className="h-2" />
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium flex items-center justify-center gap-1">
              <DollarSign className="h-3 w-3" />
              {totalRevenue.toFixed(0)}
            </div>
            <div className="text-muted-foreground">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="font-medium flex items-center justify-center gap-1">
              <Package className="h-3 w-3" />
              {machineCount}
            </div>
            <div className="text-muted-foreground">Machines</div>
          </div>
          <div className="text-center">
            <div className="font-medium flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {reportCount}
            </div>
            <div className="text-muted-foreground">Reports</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StockPopularityCard;