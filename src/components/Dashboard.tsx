import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2, Cog, Gift, DollarSign, AlertTriangle,
  ChevronLeft, ChevronRight, Trophy, TrendingUp, Package,
  Clock, Wrench, MapPin
} from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';

interface DashboardProps {
  onNavigate?: (view: string) => void;
  userProfile?: {
    role: string;
    username?: string;
    full_name?: string;
    email: string;
  };
  hasPermission?: (permission: string) => boolean;
}

interface Job {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  due_date?: string;
  machine_id?: string;
  venue_id?: string;
  machine_name?: string;
  venue_name?: string;
}

interface TopMachine {
  id: string;
  name: string;
  type: string;
  venue_name?: string;
  total_earnings: number;
  status: string;
}

interface TopVenue {
  id: string;
  name: string;
  address?: string;
  total_revenue: number;
  total_machines: number;
}

interface TopPrize {
  id: string;
  name: string;
  category?: string;
  total_dispensed: number;
  stock_quantity: number;
  cost_price?: number;
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, userProfile }) => {
  const { venues, machines } = useAppContext();

  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [topMachines, setTopMachines] = useState<TopMachine[]>([]);
  const [topVenues, setTopVenues] = useState<TopVenue[]>([]);
  const [topPrizes, setTopPrizes] = useState<TopPrize[]>([]);
  const [jobIndex, setJobIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Quick stats
  const activeMachines = machines.filter(m => m.status === 'active').length;
  const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // --- Outstanding Jobs ---
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, title, description, priority, status, due_date, machine_id, venue_id')
        .in('status', ['pending', 'in-progress'])
        .eq('archived', false)
        .order('due_date', { ascending: true })
        .limit(50);

      if (jobsData && jobsData.length > 0) {
        // Enrich with machine/venue names
        const machineIds = [...new Set(jobsData.map(j => j.machine_id).filter(Boolean))];
        const venueIds = [...new Set(jobsData.map(j => j.venue_id).filter(Boolean))];

        const [{ data: machinesData }, { data: venuesData }] = await Promise.all([
          machineIds.length > 0
            ? supabase.from('machines').select('id, name').in('id', machineIds)
            : { data: [] },
          venueIds.length > 0
            ? supabase.from('venues').select('id, name').in('id', venueIds)
            : { data: [] },
        ]);

        const machineMap = Object.fromEntries((machinesData || []).map(m => [m.id, m.name]));
        const venueMap = Object.fromEntries((venuesData || []).map(v => [v.id, v.name]));

        setPendingJobs(
          jobsData.map(j => ({
            ...j,
            machine_name: j.machine_id ? machineMap[j.machine_id] : undefined,
            venue_name: j.venue_id ? venueMap[j.venue_id] : undefined,
          }))
        );
      } else {
        setPendingJobs([]);
      }

      // --- Last 30 days date cutoff ---
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

      // --- Top 10 Machines — last 30 days token-adjusted earnings ---
      const TOKEN_VALUE = 0.83;
      const { data: machineRows } = await supabase
        .from('machines')
        .select('id, name, type, status, venue_id');

      const { data: tokenReports } = await supabase
        .from('machine_reports')
        .select('machine_id, money_collected, tokens_in_game')
        .gte('report_date', cutoff);

      if (machineRows) {
        const venueLookup = Object.fromEntries(venues.map(v => [v.id, v.name]));

        const adjustedEarningsMap: Record<string, number> = {};
        (tokenReports || []).forEach(r => {
          const tokenVal = (r.tokens_in_game || 0) * TOKEN_VALUE;
          const cash = r.money_collected || 0;
          adjustedEarningsMap[r.machine_id] = (adjustedEarningsMap[r.machine_id] || 0) + cash + tokenVal;
        });

        const sorted = machineRows
          .map(m => ({
            ...m,
            total_earnings: adjustedEarningsMap[m.id] || 0,
            venue_name: m.venue_id ? venueLookup[m.venue_id] : undefined,
          }))
          .filter(m => m.total_earnings > 0)
          .sort((a, b) => b.total_earnings - a.total_earnings)
          .slice(0, 10);

        setTopMachines(sorted);
      }

      // --- Top 10 Venues — last 30 days revenue from machine_reports ---
      const { data: venueReportRows } = await supabase
        .from('machine_reports')
        .select('machine_id, money_collected, tokens_in_game')
        .gte('report_date', cutoff);

      if (venueReportRows && machineRows) {
        const venueLookup = Object.fromEntries(venues.map(v => [v.id, v.name]));
        const machineVenueMap = Object.fromEntries(machineRows.map(m => [m.id, m.venue_id]));
        const venueMachineCount: Record<string, Set<string>> = {};
        const venueRevenueMap: Record<string, number> = {};

        venueReportRows.forEach(r => {
          const venueId = machineVenueMap[r.machine_id];
          if (!venueId) return;
          const earnings = (r.money_collected || 0) + ((r.tokens_in_game || 0) * TOKEN_VALUE);
          venueRevenueMap[venueId] = (venueRevenueMap[venueId] || 0) + earnings;
          if (!venueMachineCount[venueId]) venueMachineCount[venueId] = new Set();
          venueMachineCount[venueId].add(r.machine_id);
        });

        const topVenueList = Object.entries(venueRevenueMap)
          .map(([id, revenue]) => ({
            id,
            name: venueLookup[id] || 'Unknown',
            total_revenue: revenue,
            total_machines: venueMachineCount[id]?.size || 0,
          }))
          .sort((a, b) => b.total_revenue - a.total_revenue)
          .slice(0, 10);

        setTopVenues(topVenueList);
      }

      // --- Top 10 Prizes — added to machines in last 30 days via stock_movements ---
      const { data: prizesData } = await supabase
        .from('prizes')
        .select('id, name, category, stock_quantity, cost_price');

      const { data: recentMovements } = await supabase
        .from('stock_movements')
        .select('prize_id, quantity_change')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .gt('quantity_change', 0);

      if (prizesData) {
        // Build 30-day added quantity map from stock_movements
        const prizeAddedMap: Record<string, number> = {};
        (recentMovements || []).forEach(row => {
          if (row.prize_id) {
            prizeAddedMap[row.prize_id] = (prizeAddedMap[row.prize_id] || 0) + (row.quantity_change || 0);
          }
        });

        // Fallback: if no stock_movements data, use current machine_stock quantities
        const hasMovements = (recentMovements || []).length > 0;
        let prizeStockMap: Record<string, number> = prizeAddedMap;

        if (!hasMovements) {
          const { data: machineStockData } = await supabase
            .from('machine_stock')
            .select('prize_id, quantity');
          (machineStockData || []).forEach(row => {
            prizeStockMap[row.prize_id] = (prizeStockMap[row.prize_id] || 0) + row.quantity;
          });
        }

        const ranked = prizesData
          .map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            stock_quantity: p.stock_quantity || 0,
            cost_price: p.cost_price,
            total_dispensed: prizeStockMap[p.id] || 0,
          }))
          .sort((a, b) => b.total_dispensed - a.total_dispensed)
          .slice(0, 10);

        setTopPrizes(ranked);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [venues]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-rotate jobs every 5 seconds
  useEffect(() => {
    if (pendingJobs.length <= 1) return;
    const interval = setInterval(() => {
      setJobIndex(i => (i + 1) % pendingJobs.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [pendingJobs.length]);

  const prevJob = () => setJobIndex(i => (i - 1 + pendingJobs.length) % pendingJobs.length);
  const nextJob = () => setJobIndex(i => (i + 1) % pendingJobs.length);

  const currentJob = pendingJobs[jobIndex];

  const navigate = (view: string) => {
    if (onNavigate) onNavigate(view);
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {userProfile?.full_name ? `Welcome, ${userProfile.full_name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="text-xs">
          Refresh
        </Button>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
          onClick={() => navigate('venues')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Venues</p>
                <p className="text-2xl font-bold text-gray-900">{venues.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-400 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500"
          onClick={() => navigate('machines')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Machines</p>
                <p className="text-2xl font-bold text-gray-900">{activeMachines}</p>
                {maintenanceMachines > 0 && (
                  <p className="text-xs text-orange-500">{maintenanceMachines} in maintenance</p>
                )}
              </div>
              <Cog className="h-8 w-8 text-green-400 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
            pendingJobs.length > 0 ? 'border-l-orange-500' : 'border-l-gray-300'
          }`}
          onClick={() => navigate('jobs')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Open Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{pendingJobs.length}</p>
                {pendingJobs.filter(j => j.priority === 'urgent').length > 0 && (
                  <p className="text-xs text-red-500">
                    {pendingJobs.filter(j => j.priority === 'urgent').length} urgent
                  </p>
                )}
              </div>
              <Wrench className="h-8 w-8 text-orange-400 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
            maintenanceMachines > 0 ? 'border-l-red-400' : 'border-l-gray-300'
          }`}
          onClick={() => navigate('machines')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Alerts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {maintenanceMachines + pendingJobs.filter(j => j.priority === 'urgent').length}
                </p>
                <p className="text-xs text-gray-400">machines + urgent jobs</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Jobs Rotator */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-orange-500" />
              Outstanding Jobs
              {pendingJobs.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingJobs.length}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {pendingJobs.length > 1 && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevJob}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-400">
                    {jobIndex + 1} / {pendingJobs.length}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextJob}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => navigate('jobs')}
              >
                View All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-20 flex items-center justify-center text-gray-400 text-sm">
              Loading jobs...
            </div>
          ) : pendingJobs.length === 0 ? (
            <div className="h-20 flex flex-col items-center justify-center text-gray-400">
              <Wrench className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No outstanding jobs — all clear! 🎉</p>
            </div>
          ) : currentJob ? (
            <div
              className={`rounded-lg border p-4 transition-all ${
                PRIORITY_COLOR[currentJob.priority] || 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm truncate">{currentJob.title}</span>
                    <Badge className={`text-xs capitalize ${STATUS_COLOR[currentJob.status] || ''}`}>
                      {currentJob.status.replace('-', ' ')}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {currentJob.priority}
                    </Badge>
                  </div>
                  {currentJob.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">{currentJob.description}</p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                    {currentJob.machine_name && (
                      <span className="flex items-center gap-1">
                        <Cog className="h-3 w-3" /> {currentJob.machine_name}
                      </span>
                    )}
                    {currentJob.venue_name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {currentJob.venue_name}
                      </span>
                    )}
                    {currentJob.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due: {new Date(currentJob.due_date).toLocaleDateString('en-AU')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Progress dots */}
              {pendingJobs.length > 1 && (
                <div className="flex justify-center gap-1 mt-3">
                  {pendingJobs.slice(0, Math.min(pendingJobs.length, 10)).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setJobIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === jobIndex ? 'w-4 bg-current opacity-70' : 'w-1.5 bg-current opacity-20'
                      }`}
                    />
                  ))}
                  {pendingJobs.length > 10 && (
                    <span className="text-xs opacity-40">+{pendingJobs.length - 10}</span>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Top 10 Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top 10 Machines */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top 10 Machines
              <span className="text-xs font-normal text-gray-400 ml-1">last 30 days</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : topMachines.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No data yet</div>
            ) : (
              <div className="divide-y">
                {topMachines.map((machine, idx) => (
                  <div key={machine.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <span
                      className={`text-xs font-bold w-5 text-center ${
                        idx === 0 ? 'text-yellow-500' :
                        idx === 1 ? 'text-gray-400' :
                        idx === 2 ? 'text-amber-600' : 'text-gray-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{machine.name}</p>
                      {machine.venue_name && (
                        <p className="text-xs text-gray-400 truncate">{machine.venue_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        ${machine.total_earnings.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <Badge
                        variant={machine.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {machine.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-2 border-t">
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('machines')}>
                View All Machines
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Venues */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5 text-green-500" />
              Top 10 Venues
              <span className="text-xs font-normal text-gray-400 ml-1">last 30 days</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : topVenues.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No data yet</div>
            ) : (
              <div className="divide-y">
                {topVenues.map((venue, idx) => (
                  <div key={venue.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <span
                      className={`text-xs font-bold w-5 text-center ${
                        idx === 0 ? 'text-yellow-500' :
                        idx === 1 ? 'text-gray-400' :
                        idx === 2 ? 'text-amber-600' : 'text-gray-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{venue.name}</p>
                      <p className="text-xs text-gray-400">
                        {venue.total_machines} machine{venue.total_machines !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-green-600">
                      ${venue.total_revenue.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-2 border-t">
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('venues')}>
                View All Venues
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-5 w-5 text-purple-500" />
              Top 10 Products
              <span className="text-xs font-normal text-gray-400 ml-1">last 30 days</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : topPrizes.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No data yet</div>
            ) : (
              <div className="divide-y">
                {topPrizes.map((prize, idx) => (
                  <div key={prize.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <span
                      className={`text-xs font-bold w-5 text-center ${
                        idx === 0 ? 'text-yellow-500' :
                        idx === 1 ? 'text-gray-400' :
                        idx === 2 ? 'text-amber-600' : 'text-gray-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{prize.name}</p>
                      {prize.category && (
                        <p className="text-xs text-gray-400 truncate">{prize.category}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-purple-600">
                        {prize.total_dispensed > 0 ? `${prize.total_dispensed} added` : 'No activity'}
                      </p>
                      {prize.stock_quantity <= 5 && (
                        <Badge variant="destructive" className="text-xs">
                          Low stock
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-2 border-t">
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('prizes')}>
                View All Prizes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;