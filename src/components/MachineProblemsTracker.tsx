import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Wrench, Calendar, TrendingUp, X, CheckCircle, DollarSign, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import ServiceScheduleDialog from './ServiceScheduleDialog';

interface MachinePart {
  id: string;
  machine_id: string;
  part_id: string;
  quantity: number;
  created_at: string;
  notes?: string;
  part?: {
    name: string;
    cost_price: number;
  };
}

interface MachinePartUsage {
  machine_id: string;
  machine_name: string;
  venue_name?: string;
  part_count_12_months: number;
  recent_parts: MachinePart[];
  total_cost: number;
  problem_severity: 'high' | 'medium' | 'low';
  is_dismissed?: boolean;
  dismissed_at?: string;
}

// NEW: Payout issue interface
interface MachinePayoutIssue {
  machine_id: string;
  machine_name: string;
  venue_name?: string;
  average_payout: number;
  payout_type: 'too_high' | 'too_low';
  reports_count: number;
  problem_severity: 'high' | 'medium' | 'low';
}

interface DismissAlert {
  machine_id: string;
  problem_type: string;
  dismissed_at: string;
  dismissed_by: string;
}

const MachineProblemsTracker: React.FC = () => {
  const { machines, venues } = useAppContext();
  const { toast } = useToast();
  const [problemMachines, setProblemMachines] = useState<MachinePartUsage[]>([]);
  const [payoutProblems, setPayoutProblems] = useState<MachinePayoutIssue[]>([]); // NEW
  const [loading, setLoading] = useState(true);
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    analyzeMachinePartUsage();
    analyzePayoutIssues(); // NEW
  }, [machines]);

  // NEW: Analyze payout issues
  const analyzePayoutIssues = async () => {
    try {
      console.log('📊 Analyzing machine payout issues...');
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentReports, error } = await supabase
        .from('machine_reports')
        .select('machine_id, money_collected, prize_value, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('Error fetching reports for payout analysis:', error);
        return;
      }

      if (!recentReports || recentReports.length === 0) {
        setPayoutProblems([]);
        return;
      }

      // Group by machine and calculate average payout
      const machinePayouts = new Map<string, { payouts: number[], totalReports: number }>();
      
      recentReports.forEach(report => {
        if (report.money_collected > 0 && report.prize_value > 0) {
          const payout = (report.prize_value / report.money_collected) * 100;
          
          if (!machinePayouts.has(report.machine_id)) {
            machinePayouts.set(report.machine_id, { payouts: [], totalReports: 0 });
          }
          
          const machineData = machinePayouts.get(report.machine_id)!;
          machineData.payouts.push(payout);
          machineData.totalReports++;
        }
      });

      const payoutIssues: MachinePayoutIssue[] = [];

      machinePayouts.forEach((data, machineId) => {
        const machine = machines.find(m => m.id === machineId);
        if (!machine || data.payouts.length < 3) return; // Need at least 3 reports

        const venue = venues.find(v => v.id === machine.venue_id);
        const averagePayout = data.payouts.reduce((sum, p) => sum + p, 0) / data.payouts.length;

        // Check if dismissed
        const highPayoutKey = `${machineId}_payout_high`;
        const lowPayoutKey = `${machineId}_payout_low`;
        
        let issueType: 'too_high' | 'too_low' | null = null;
        let severity: 'high' | 'medium' | 'low' = 'medium';

        if (averagePayout > 30) {
          if (!dismissedAlerts.has(highPayoutKey)) {
            issueType = 'too_high';
            severity = averagePayout > 40 ? 'high' : 'medium';
          }
        } else if (averagePayout < 10) {
          if (!dismissedAlerts.has(lowPayoutKey)) {
            issueType = 'too_low';
            severity = averagePayout < 5 ? 'high' : 'medium';
          }
        }

        if (issueType) {
          payoutIssues.push({
            machine_id: machineId,
            machine_name: machine.name,
            venue_name: venue?.name,
            average_payout: averagePayout,
            payout_type: issueType,
            reports_count: data.totalReports,
            problem_severity: severity
          });
        }
      });

      setPayoutProblems(payoutIssues);
      console.log('✅ Payout analysis completed:', payoutIssues.length, 'issues found');

    } catch (error) {
      console.error('Error analyzing payout issues:', error);
    }
  };

  const loadDismissedAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('machine_problems')
        .select('machine_id, problem_type, dismissed_at')
        .not('dismissed_at', 'is', null);

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading dismissed alerts:', error);
        return;
      }

      if (data) {
        const dismissed = new Set(data.map(d => `${d.machine_id}_${d.problem_type}`));
        setDismissedAlerts(dismissed);
      }
    } catch (error) {
      console.error('Error loading dismissed alerts:', error);
    }
  };

  const analyzeMachinePartUsage = async () => {
    try {
      setLoading(true);
      
      await loadDismissedAlerts();
      
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const { data: machinePartsData, error } = await supabase
        .from('machine_parts')
        .select(`
          *,
          parts(name, cost_price)
        `)
        .gte('created_at', twelveMonthsAgo.toISOString());

      if (error) {
        console.error('Error fetching machine parts:', error);
        return;
      }

      const { data: recentJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('machine_id, status, created_at, scheduled_date')
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (jobsError) {
        console.warn('Error fetching recent jobs:', jobsError);
      }

      const recentlyServicedMachines = new Set(recentJobs?.map(job => job.machine_id) || []);

      const machineUsageMap = new Map<string, MachinePart[]>();
      
      machinePartsData?.forEach((machinePart: MachinePart) => {
        const machineId = machinePart.machine_id;
        if (!machineUsageMap.has(machineId)) {
          machineUsageMap.set(machineId, []);
        }
        machineUsageMap.get(machineId)?.push(machinePart);
      });

      const problemMachinesData: MachinePartUsage[] = [];

      machineUsageMap.forEach((parts, machineId) => {
        const machine = machines.find(m => m.id === machineId);
        if (!machine) return;

        const venue = venues.find(v => v.id === machine.venue_id);
        
        const totalPartsUsed = parts.reduce((sum, part) => sum + part.quantity, 0);
        
        const totalCost = parts.reduce((sum, part) => {
          const cost = part.part?.cost_price || 0;
          return sum + (cost * part.quantity);
        }, 0);

        let severity: 'high' | 'medium' | 'low' = 'low';
        if (totalPartsUsed >= 5) {
          severity = 'high';
        } else if (totalPartsUsed >= 3) {
          severity = 'medium';
        }

        const alertKey = `${machineId}_parts_usage`;
        const isDismissed = dismissedAlerts.has(alertKey);
        const wasRecentlyServiced = recentlyServicedMachines.has(machineId);

        if (totalPartsUsed >= 3 && !isDismissed && !wasRecentlyServiced) {
          problemMachinesData.push({
            machine_id: machineId,
            machine_name: machine.name,
            venue_name: venue?.name,
            part_count_12_months: totalPartsUsed,
            recent_parts: parts.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
            total_cost: totalCost,
            problem_severity: severity,
            is_dismissed: false
          });
        }
      });

      problemMachinesData.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        if (severityOrder[a.problem_severity] !== severityOrder[b.problem_severity]) {
          return severityOrder[b.problem_severity] - severityOrder[a.problem_severity];
        }
        return b.part_count_12_months - a.part_count_12_months;
      });

      setProblemMachines(problemMachinesData);

      const highSeverityMachines = problemMachinesData.filter(m => m.problem_severity === 'high');
      if (highSeverityMachines.length > 0) {
        try {
          await supabase.functions.invoke('send-machine-problem-alert', {
            body: {
              machines: highSeverityMachines,
              recipient: 'Workshop@gameonentertainment.com.au'
            }
          });
        } catch (error) {
          console.error('Failed to send machine problem alert:', error);
        }
      }

    } catch (error) {
      console.error('Error analyzing machine part usage:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze machine problems',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDismissAlert = (machine: any, problemType: string) => {
    setSelectedMachine({ ...machine, problemType });
    setShowDismissDialog(true);
  };

  const confirmDismissAlert = async () => {
    if (!selectedMachine) return;

    try {
      console.log('📝 Dismissing alert for machine:', selectedMachine.machine_name, 'type:', selectedMachine.problemType);

      const { error } = await supabase
        .from('machine_problems')
        .insert([{
          machine_id: selectedMachine.machine_id,
          problem_type: selectedMachine.problemType,
          dismissed_at: new Date().toISOString(),
          dismissed_by: 'current_user'
        }]);

      if (error) {
        console.warn('machine_problems table not found, using localStorage fallback');
        
        const alertKey = `${selectedMachine.machine_id}_${selectedMachine.problemType}`;
        const newDismissed = new Set(dismissedAlerts);
        newDismissed.add(alertKey);
        setDismissedAlerts(newDismissed);
        
        const dismissedData = Array.from(newDismissed);
        localStorage.setItem('dismissedMachineAlerts', JSON.stringify(dismissedData));
      } else {
        await loadDismissedAlerts();
      }

      // Remove from appropriate problem list
      if (selectedMachine.problemType === 'parts_usage') {
        setProblemMachines(prev => prev.filter(m => m.machine_id !== selectedMachine.machine_id));
      } else if (selectedMachine.problemType.includes('payout')) {
        setPayoutProblems(prev => prev.filter(m => m.machine_id !== selectedMachine.machine_id));
      }

      toast({
        title: 'Alert Dismissed',
        description: `Machine problem alert for ${selectedMachine.machine_name} has been dismissed`,
      });

      setShowDismissDialog(false);
      setSelectedMachine(null);

    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to dismiss alert',
        variant: 'destructive'
      });
    }
  };

  const handleScheduleMaintenance = (machine: any) => {
    setSelectedMachine(machine);
    setShowServiceDialog(true);
  };

  const handleServiceScheduled = async () => {
    if (selectedMachine) {
      try {
        console.log('📝 Auto-dismissing alert for scheduled maintenance:', selectedMachine.machine_name);

        const problemType = selectedMachine.problemType || 'parts_usage';
        const { error } = await supabase
          .from('machine_problems')
          .insert([{
            machine_id: selectedMachine.machine_id,
            problem_type: problemType,
            dismissed_at: new Date().toISOString(),
            dismissed_by: 'auto_service_scheduled'
          }]);

        if (error) {
          const alertKey = `${selectedMachine.machine_id}_${problemType}`;
          const newDismissed = new Set(dismissedAlerts);
          newDismissed.add(alertKey);
          setDismissedAlerts(newDismissed);
          
          const dismissedData = Array.from(newDismissed);
          localStorage.setItem('dismissedMachineAlerts', JSON.stringify(dismissedData));
        } else {
          await loadDismissedAlerts();
        }

        setProblemMachines(prev => prev.filter(m => m.machine_id !== selectedMachine.machine_id));
        setPayoutProblems(prev => prev.filter(m => m.machine_id !== selectedMachine.machine_id));

        toast({
          title: 'Service Scheduled',
          description: `Maintenance scheduled for ${selectedMachine.machine_name}. Alert has been automatically dismissed.`,
        });

        window.dispatchEvent(new CustomEvent('machineProblemsUpdated'));
        
      } catch (error) {
        console.error('Error auto-dismissing alert:', error);
        toast({
          title: 'Service Scheduled',
          description: `Maintenance scheduled for ${selectedMachine.machine_name}.`,
        });
      }
    }
    
    setShowServiceDialog(false);
    setSelectedMachine(null);
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dismissedMachineAlerts');
      if (stored) {
        const dismissed = new Set<string>(JSON.parse(stored));
        setDismissedAlerts(dismissed);
      }
    } catch (error) {
      console.error('Error loading dismissed alerts from localStorage:', error);
    }
  }, []);

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getSeverityIcon = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'medium': return <TrendingUp className="h-4 w-4 text-orange-600" />;
      case 'low': return <Wrench className="h-4 w-4 text-yellow-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Machine Problems Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Analyzing machine part usage and payout performance...</p>
        </CardContent>
      </Card>
    );
  }

  const totalProblems = problemMachines.length + payoutProblems.length;

  if (totalProblems === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Machine Problems Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-600 font-medium">✅ All machines are operating normally!</p>
          <p className="text-gray-500 text-sm mt-1">
            No machines have maintenance issues or payout problems.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            Machine Problems Alert
          </CardTitle>
          <p className="text-orange-700 text-sm">
            {totalProblems} machine(s) showing problems ({problemMachines.length} maintenance, {payoutProblems.length} payout issues)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parts Usage Problems */}
          {problemMachines.map((machine) => (
            <Card key={`parts_${machine.machine_id}`} className="border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{machine.machine_name}</CardTitle>
                    {machine.venue_name && (
                      <p className="text-sm text-gray-600">📍 {machine.venue_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(machine.problem_severity)}>
                      {getSeverityIcon(machine.problem_severity)}
                      HIGH PARTS USAGE
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDismissAlert(machine, 'parts_usage')}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Parts Used (12mo):</span>
                    <div className="font-semibold text-red-600">
                      {machine.part_count_12_months} parts
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Cost:</span>
                    <div className="font-semibold">
                      ${machine.total_cost.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Service:</span>
                    <div className="font-semibold">
                      {formatDate(machine.recent_parts[0]?.created_at)}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Recent Parts Used:</p>
                  <div className="space-y-1">
                    {machine.recent_parts.slice(0, 3).map((part, index) => (
                      <div key={part.id} className="flex justify-between items-center text-xs bg-white p-2 rounded">
                        <span>
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {formatDate(part.created_at)}
                        </span>
                        <span className="font-medium">
                          {part.part?.name || 'Unknown Part'} (x{part.quantity})
                        </span>
                        <span className="text-gray-500">
                          ${((part.part?.cost_price || 0) * part.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {machine.recent_parts.length > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        + {machine.recent_parts.length - 3} more parts...
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    onClick={() => handleScheduleMaintenance(machine)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Wrench className="h-4 w-4 mr-1" />
                    Schedule Maintenance
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDismissAlert(machine, 'parts_usage')}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Dismiss Alert
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* NEW: Payout Problems */}
          {payoutProblems.map((machine) => (
            <Card key={`payout_${machine.machine_id}`} className="border border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{machine.machine_name}</CardTitle>
                    {machine.venue_name && (
                      <p className="text-sm text-gray-600">📍 {machine.venue_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getSeverityColor(machine.problem_severity)} border-purple-300`}>
                      <DollarSign className="h-4 w-4 mr-1" />
                      {machine.payout_type === 'too_high' ? 'PAYOUT TOO HIGH' : 'PAYOUT TOO LOW'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDismissAlert(machine, `payout_${machine.payout_type}`)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Average Payout:</span>
                    <div className={`font-semibold ${machine.payout_type === 'too_high' ? 'text-red-600' : 'text-orange-600'}`}>
                      {machine.average_payout.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Target Range:</span>
                    <div className="font-semibold text-green-600">
                      10% - 30%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Reports Count:</span>
                    <div className="font-semibold">
                      {machine.reports_count} reports
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-3 rounded border border-purple-200">
                  <p className="text-purple-800 text-sm font-medium">
                    {machine.payout_type === 'too_high' 
                      ? '⚠️ High payout percentage may indicate loose claw settings or prizes too cheap' 
                      : '⚠️ Low payout percentage may indicate tight claw settings or prizes too expensive'
                    }
                  </p>
                  <p className="text-purple-700 text-xs mt-1">
                    {machine.payout_type === 'too_high' 
                      ? 'Consider tightening claw strength or increasing prize costs'
                      : 'Consider loosening claw strength or reducing prize costs'
                    }
                  </p>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    onClick={() => handleScheduleMaintenance(machine)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Wrench className="h-4 w-4 mr-1" />
                    Schedule Adjustment
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDismissAlert(machine, `payout_${machine.payout_type}`)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Dismiss Alert
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Dismiss Alert Confirmation Dialog */}
      <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Dismiss Machine Alert
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-3">
              <p className="text-gray-700">
                Are you sure you want to dismiss the problem alert for <strong>{selectedMachine?.machine_name}</strong>?
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm font-medium">
                  ⚠️ Warning: This will hide the alert from the dashboard
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  The alert will not reappear unless new issues are detected.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDismissDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDismissAlert}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              Dismiss Alert
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Schedule Dialog */}
      {selectedMachine && (
        <ServiceScheduleDialog
          isOpen={showServiceDialog}
          onClose={() => setShowServiceDialog(false)}
          machineId={selectedMachine.machine_id}
          machineName={selectedMachine.machine_name}
          onServiceScheduled={handleServiceScheduled}
        />
      )}
    </>
  );
};

export default MachineProblemsTracker;