import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, CheckCircle, Home, TrendingDown, TrendingUp, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface PayoutIssue {
  machineId: string;
  machineName: string;
  venue: string;
  currentPayout: number;
  issue: 'too_low' | 'too_high';
  description: string;
}

const PayoutIssues: React.FC = () => {
  const { machines = [] } = useAppContext();
  const navigate = useNavigate();
  const [issues, setIssues] = useState<PayoutIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'too_low' | 'too_high'>('all');
  const [filterVenue, setFilterVenue] = useState<string>('all');

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const calculateMachinePayout = async (machineId: string): Promise<number> => {
    try {
      const { data: reportData } = await supabase
        .from('machine_reports')
        .select('money_collected, prize_value, toys_dispensed, current_toy_count, previous_toy_count')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!reportData || reportData.length === 0) {
        return 0;
      }
      
      const report = reportData[0];
      const earnings = report.money_collected || 0;
      let prizeValue = report.prize_value || 0;
      let toysDispensed = report.toys_dispensed || 0;
      
      if (prizeValue === 0 && toysDispensed > 0) {
        const machine = machines.find(m => m.id === machineId);
        if (machine?.current_prize) {
          prizeValue = toysDispensed * parseFloat(machine.current_prize.cost.toString());
        }
      }
      
      if (toysDispensed === 0 && report.current_toy_count !== null && report.previous_toy_count !== null) {
        toysDispensed = Math.max(0, report.current_toy_count - report.previous_toy_count);
        
        if (toysDispensed > 0) {
          const machine = machines.find(m => m.id === machineId);
          if (machine?.current_prize) {
            prizeValue = toysDispensed * parseFloat(machine.current_prize.cost.toString());
          }
        }
      }
      
      const percentage = earnings > 0 && prizeValue > 0 ? (prizeValue / earnings) * 100 : 0;
      return percentage > 0 ? Math.round(percentage * 100) / 100 : 0;
      
    } catch (error) {
      return 0;
    }
  };

  const checkPayoutIssues = async () => {
    setIsLoading(true);
    
    try {
      const foundIssues: PayoutIssue[] = [];
      
      for (const machine of machines) {
        const payout = await calculateMachinePayout(machine.id);
        
        if (payout > 0) {
          if (payout < 10) {
            foundIssues.push({
              machineId: machine.id,
              machineName: machine.name,
              venue: machine.venue?.name || 'Unknown',
              currentPayout: payout,
              issue: 'too_low',
              description: `Payout is ${payout.toFixed(1)}% (below 10% minimum)`
            });
          } else if (payout > 30) {
            foundIssues.push({
              machineId: machine.id,
              machineName: machine.name,
              venue: machine.venue?.name || 'Unknown',
              currentPayout: payout,
              issue: 'too_high',
              description: `Payout is ${payout.toFixed(1)}% (above 30% maximum)`
            });
          }
        }
      }
      
      setIssues(foundIssues);
      setLastChecked(new Date());
      
      if (foundIssues.length === 0) {
        toast.success('No payout issues found!');
      } else {
        toast.warning(`Found ${foundIssues.length} payout issue(s)`);
      }
    } catch (error) {
      toast.error('Error checking payout issues');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (machines.length > 0) {
      checkPayoutIssues();
    }
  }, [machines]);

  // Unique venues from issues for the venue filter
  const venueOptions = useMemo(() => {
    const names = [...new Set(issues.map(i => i.venue))].sort();
    return names;
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const typeMatch = filterType === 'all' || issue.issue === filterType;
      const venueMatch = filterVenue === 'all' || issue.venue === filterVenue;
      return typeMatch && venueMatch;
    });
  }, [issues, filterType, filterVenue]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              Payout Issues
            </h2>
            <p className="text-gray-600 mt-1">
              Machines with payout percentages outside the 10-30% range
            </p>
            {lastChecked && (
              <p className="text-sm text-gray-500 mt-1">
                Last checked: {lastChecked.toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <Button 
          onClick={checkPayoutIssues} 
          disabled={isLoading}
          className="flex items-center gap-2"
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Checking...' : 'Refresh'}
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Analyzing machine payouts...</p>
            </div>
          </CardContent>
        </Card>
      ) : issues.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All Good!</h3>
              <p className="text-gray-600">No payout issues detected. All machines are within the acceptable range.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 border rounded-lg">
            <Filter className="h-4 w-4 text-gray-500 shrink-0" />
            <span className="text-sm font-medium text-gray-600">Filter:</span>

            {/* Issue type buttons */}
            <div className="flex gap-2">
              {(['all', 'too_low', 'too_high'] as const).map(type => (
                <Button
                  key={type}
                  size="sm"
                  variant={filterType === type ? 'default' : 'outline'}
                  onClick={() => setFilterType(type)}
                  className={
                    filterType === type
                      ? type === 'too_low' ? 'bg-blue-600 hover:bg-blue-700' : type === 'too_high' ? 'bg-red-600 hover:bg-red-700' : ''
                      : ''
                  }
                >
                  {type === 'all' && `All (${issues.length})`}
                  {type === 'too_low' && (
                    <><TrendingDown className="h-3.5 w-3.5 mr-1" />Too Low ({issues.filter(i => i.issue === 'too_low').length})</>
                  )}
                  {type === 'too_high' && (
                    <><TrendingUp className="h-3.5 w-3.5 mr-1" />Too High ({issues.filter(i => i.issue === 'too_high').length})</>
                  )}
                </Button>
              ))}
            </div>

            {/* Venue filter */}
            {venueOptions.length > 1 && (
              <Select value={filterVenue} onValueChange={setFilterVenue}>
                <SelectTrigger className="w-48 h-8 text-sm">
                  <SelectValue placeholder="All venues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All venues</SelectItem>
                  {venueOptions.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(filterType !== 'all' || filterVenue !== 'all') && (
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-500 text-xs"
                onClick={() => { setFilterType('all'); setFilterVenue('all'); }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {filteredIssues.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">No issues match the current filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredIssues.map((issue, index) => (
                <Card
                  key={index}
                  className={`border-l-4 ${issue.issue === 'too_low' ? 'border-l-blue-500' : 'border-l-red-500'}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className={`h-5 w-5 ${issue.issue === 'too_low' ? 'text-blue-500' : 'text-red-500'}`} />
                        {issue.machineName}
                      </CardTitle>
                      <Badge
                        className={issue.issue === 'too_low'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-red-100 text-red-800 border-red-200'}
                      >
                        {issue.issue === 'too_low'
                          ? <><TrendingDown className="h-3 w-3 mr-1 inline" />Too Low</>
                          : <><TrendingUp className="h-3 w-3 mr-1 inline" />Too High</>}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600"><strong>Venue:</strong> {issue.venue}</p>
                      <p className="text-sm text-gray-600">
                        <strong>Current Payout:</strong>{' '}
                        <span className={`font-semibold ${issue.issue === 'too_low' ? 'text-blue-700' : 'text-red-700'}`}>
                          {issue.currentPayout.toFixed(1)}%
                        </span>
                        <span className="text-gray-400 ml-2">(target: 10–30%)</span>
                      </p>
                      <p className={`text-sm ${issue.issue === 'too_low' ? 'text-blue-700' : 'text-red-700'}`}>
                        {issue.description}
                      </p>
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>Recommendation:</strong> Check prize value, toy size, games per win setting, claw voltage and claw size
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PayoutIssues;