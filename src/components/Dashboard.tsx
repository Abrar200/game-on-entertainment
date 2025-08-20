import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Cog, Gift, Package, DollarSign, TrendingUp, AlertTriangle, Plus, Users, Activity, Target, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import MachineProblemsTracker from '@/components/MachineProblemsTracker';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface DashboardProps {
  onNavigate?: (view: string) => void;
}

interface BusinessHealth {
  score: number;
  issues: string[];
  improvements: string[];
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface DashboardStats {
  totalRevenue: number;
  revenueGrowth: number;
  averagePayout: number;
  machineUptime: number;
  lowStockAlerts: number;
  completedJobs: number;
  pendingIssues: number;
  loading: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { venues, machines, prizes, parts, setCurrentView } = useAppContext();
  const { toast } = useToast();
  const [businessHealth, setBusinessHealth] = useState<BusinessHealth>({
    score: 0,
    issues: [],
    improvements: [],
    status: 'warning'
  });
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalRevenue: 0,
    revenueGrowth: 0,
    averagePayout: 0,
    machineUptime: 0,
    lowStockAlerts: 0,
    completedJobs: 0,
    pendingIssues: 0,
    loading: true
  });

  useEffect(() => {
    fetchDashboardData();
  }, [machines, prizes, parts]);

  const fetchDashboardData = async () => {
    try {
      setDashboardStats(prev => ({ ...prev, loading: true }));

      // Fetch revenue data from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentReports, error: reportsError } = await supabase
        .from('machine_reports')
        .select('money_collected, prize_value, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Fetch revenue data from 30-60 days ago for growth calculation
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: previousReports, error: prevError } = await supabase
        .from('machine_reports')
        .select('money_collected')
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      // Fetch jobs data
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('status, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (reportsError) console.error('Reports error:', reportsError);
      if (prevError) console.error('Previous reports error:', prevError);
      if (jobsError) console.warn('Jobs error (table may not exist):', jobsError);

      // Calculate statistics
      const totalRevenue = recentReports?.reduce((sum, report) => sum + (report.money_collected || 0), 0) || 0;
      const previousRevenue = previousReports?.reduce((sum, report) => sum + (report.money_collected || 0), 0) || 0;
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Calculate average payout
      const validReports = recentReports?.filter(r => r.money_collected > 0 && r.prize_value > 0) || [];
      const averagePayout = validReports.length > 0 
        ? validReports.reduce((sum, r) => sum + ((r.prize_value / r.money_collected) * 100), 0) / validReports.length
        : 0;

      // Machine uptime calculation
      const activeMachines = machines.filter(m => m.status === 'active').length;
      const machineUptime = machines.length > 0 ? (activeMachines / machines.length) * 100 : 100;

      // Stock alerts
      const lowStockPrizes = prizes.filter(prize => prize.stock_quantity <= 5).length;
      const lowStockParts = parts.filter(part => part.stock_quantity <= part.low_stock_limit).length;
      const lowStockAlerts = lowStockPrizes + lowStockParts;

      // Jobs statistics
      const completedJobs = jobs?.filter(job => job.status === 'completed').length || 0;
      const pendingIssues = jobs?.filter(job => job.status !== 'completed').length || 0;

      setDashboardStats({
        totalRevenue,
        revenueGrowth,
        averagePayout,
        machineUptime,
        lowStockAlerts,
        completedJobs,
        pendingIssues,
        loading: false
      });

      // Calculate business health
      calculateBusinessHealth({
        machineUptime,
        lowStockAlerts,
        pendingIssues,
        averagePayout,
        revenueGrowth
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardStats(prev => ({ ...prev, loading: false }));
    }
  };

  const calculateBusinessHealth = (stats: {
    machineUptime: number;
    lowStockAlerts: number;
    pendingIssues: number;
    averagePayout: number;
    revenueGrowth: number;
  }) => {
    let score = 100;
    const issues: string[] = [];
    const improvements: string[] = [];

    // Machine uptime impact (30% of score)
    if (stats.machineUptime < 90) {
      score -= (90 - stats.machineUptime) * 2;
      issues.push(`${(100 - stats.machineUptime).toFixed(1)}% of machines need attention`);
      improvements.push('Schedule maintenance for inactive machines');
    }

    // Stock management impact (25% of score)
    if (stats.lowStockAlerts > 0) {
      score -= Math.min(stats.lowStockAlerts * 3, 25);
      issues.push(`${stats.lowStockAlerts} items with low stock`);
      improvements.push('Restock low inventory items');
    }

    // Pending issues impact (20% of score)
    if (stats.pendingIssues > 0) {
      score -= Math.min(stats.pendingIssues * 4, 20);
      issues.push(`${stats.pendingIssues} pending maintenance issues`);
      improvements.push('Complete pending maintenance jobs');
    }

    // Payout optimization (15% of score)
    if (stats.averagePayout > 30 || stats.averagePayout < 10) {
      score -= 15;
      if (stats.averagePayout > 30) {
        issues.push('Average payout too high (>30%)');
        improvements.push('Adjust prize costs or claw settings');
      } else if (stats.averagePayout < 10) {
        issues.push('Average payout too low (<10%)');
        improvements.push('Make games more rewarding');
      }
    }

    // Revenue growth impact (10% of score)
    if (stats.revenueGrowth < 0) {
      score -= Math.min(Math.abs(stats.revenueGrowth) * 0.5, 10);
      issues.push('Revenue declining');
      improvements.push('Analyze underperforming machines');
    }

    score = Math.max(0, Math.min(100, score));

    let status: BusinessHealth['status'] = 'excellent';
    if (score < 70) status = 'critical';
    else if (score < 80) status = 'warning';
    else if (score < 90) status = 'good';

    setBusinessHealth({ score, issues, improvements, status });
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-prize':
        setCurrentView('prizes');
        break;
      case 'add-part':
        setCurrentView('parts');
        break;
      case 'add-machine':
        setCurrentView('machines');
        break;
      case 'add-venue':
        setCurrentView('venues');
        break;
      default:
        toast({
          title: 'Quick Action',
          description: `${action} action coming soon!`,
        });
        break;
    }
  };

  const getHealthColor = (status: BusinessHealth['status']) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthBackground = (status: BusinessHealth['status']) => {
    switch (status) {
      case 'excellent': return 'bg-green-50 border-green-200';
      case 'good': return 'bg-blue-50 border-blue-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'critical': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  // Calculate basic stats
  const activeMachines = machines.filter(m => m.status === 'active').length;
  const totalPrizes = prizes.reduce((sum, prize) => sum + prize.stock_quantity, 0);
  const totalParts = parts.reduce((sum, part) => sum + part.stock_quantity, 0);
  const lowStockPrizes = prizes.filter(prize => prize.stock_quantity <= 5).length;
  const lowStockParts = parts.filter(part => part.stock_quantity <= part.low_stock_limit).length;
  const prizeValue = prizes.reduce((sum, prize) => sum + (prize.cost * prize.stock_quantity), 0);
  const partValue = parts.reduce((sum, part) => sum + (part.cost_price * part.stock_quantity), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Complete overview of your arcade business operations</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Business Health Score */}
      <Card className={`${getHealthBackground(businessHealth.status)} border-2`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Business Health Score
            </div>
            <Badge className={`${
              businessHealth.status === 'excellent' ? 'bg-green-500' :
              businessHealth.status === 'good' ? 'bg-blue-500' :
              businessHealth.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            } text-white text-lg px-3 py-1`}>
              {businessHealth.status.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                <path
                  d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                  fill="none"
                  stroke={
                    businessHealth.status === 'excellent' ? '#10b981' :
                    businessHealth.status === 'good' ? '#3b82f6' :
                    businessHealth.status === 'warning' ? '#f59e0b' : '#ef4444'
                  }
                  strokeWidth="3"
                  strokeDasharray={`${businessHealth.score}, 100`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getHealthColor(businessHealth.status)}`}>
                    {Math.round(businessHealth.score)}
                  </div>
                  <div className="text-sm text-gray-600">/ 100</div>
                </div>
              </div>
            </div>
          </div>
          
          {businessHealth.issues.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-red-700 mb-2">Issues to Address:</h4>
              <ul className="space-y-1">
                {businessHealth.issues.map((issue, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {businessHealth.improvements.length > 0 && (
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">Recommended Actions:</h4>
              <ul className="space-y-1">
                {businessHealth.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-blue-600">
                    <Target className="h-4 w-4" />
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Machine Problems Alert */}
      <MachineProblemsTracker />

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (30 days)</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${dashboardStats.totalRevenue.toFixed(2)}
            </div>
            <div className="flex items-center text-xs mt-1">
              {dashboardStats.revenueGrowth >= 0 ? (
                <ArrowUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <ArrowDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={dashboardStats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(dashboardStats.revenueGrowth).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Machine Uptime</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboardStats.machineUptime.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {activeMachines} of {machines.length} machines active
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Payout</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {dashboardStats.averagePayout > 0 ? `${dashboardStats.averagePayout.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Target: 10-30%
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboardStats.lowStockAlerts}
            </div>
            <p className="text-xs text-muted-foreground">
              Stock & maintenance alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operational Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Venues</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{venues.length}</div>
            <p className="text-xs text-muted-foreground">Active locations</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Machines</CardTitle>
            <Cog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMachines}</div>
            <p className="text-xs text-muted-foreground">
              {machines.length} total, {machines.filter(m => m.status === 'maintenance').length} in maintenance
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prize Inventory</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPrizes}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                ${prizeValue.toFixed(0)} value
              </p>
              {lowStockPrizes > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {lowStockPrizes} low
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parts Inventory</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParts}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                ${partValue.toFixed(0)} value
              </p>
              {lowStockParts > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {lowStockParts} low
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={() => handleQuickAction('add-prize')}
              className="h-20 flex-col bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Gift className="h-6 w-6 mb-2" />
              <div className="text-center">
                <div className="font-medium">Add Prize</div>
                <div className="text-xs opacity-90">Restock inventory</div>
              </div>
            </Button>
            <Button
              onClick={() => handleQuickAction('add-part')}
              className="h-20 flex-col bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Package className="h-6 w-6 mb-2" />
              <div className="text-center">
                <div className="font-medium">Add Part</div>
                <div className="text-xs opacity-90">Maintenance stock</div>
              </div>
            </Button>
            <Button
              onClick={() => handleQuickAction('add-machine')}
              className="h-20 flex-col bg-green-600 hover:bg-green-700 text-white"
            >
              <Cog className="h-6 w-6 mb-2" />
              <div className="text-center">
                <div className="font-medium">Add Machine</div>
                <div className="text-xs opacity-90">Expand fleet</div>
              </div>
            </Button>
            <Button
              onClick={() => handleQuickAction('add-venue')}
              className="h-20 flex-col bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Building2 className="h-6 w-6 mb-2" />
              <div className="text-center">
                <div className="font-medium">Add Venue</div>
                <div className="text-xs opacity-90">New location</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            System Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-green-700">Performing Well</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Active Machines</span>
                  <Badge variant="default">{activeMachines}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Venues</span>
                  <Badge variant="default">{venues.length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Jobs Completed</span>
                  <Badge variant="default">{dashboardStats.completedJobs}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-yellow-700">Needs Attention</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Maintenance Queue</span>
                  <Badge variant="secondary">{machines.filter(m => m.status === 'maintenance').length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pending Issues</span>
                  <Badge variant="secondary">{dashboardStats.pendingIssues}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Low Stock Items</span>
                  <Badge variant="secondary">{lowStockPrizes + lowStockParts}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-red-700">Critical</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Inactive Machines</span>
                  <Badge variant="destructive">{machines.filter(m => m.status === 'inactive').length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Critical Stock</span>
                  <Badge variant="destructive">{prizes.filter(p => p.stock_quantity === 0).length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Urgent Jobs</span>
                  <Badge variant="destructive">
                    {/* This would need to be calculated from jobs with urgent priority */}
                    0
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;