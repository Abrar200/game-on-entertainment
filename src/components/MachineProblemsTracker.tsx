import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wrench, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

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
}

const MachineProblemsTracker: React.FC = () => {
  const { machines, venues } = useAppContext();
  const { toast } = useToast();
  const [problemMachines, setProblemMachines] = useState<MachinePartUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeMachinePartUsage();
  }, [machines]);

  const analyzeMachinePartUsage = async () => {
    try {
      setLoading(true);
      
      // Get all machine parts used in the last 12 months
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

      // Group by machine and analyze
      const machineUsageMap = new Map<string, MachinePart[]>();
      
      machinePartsData.forEach((machinePart: MachinePart) => {
        const machineId = machinePart.machine_id;
        if (!machineUsageMap.has(machineId)) {
          machineUsageMap.set(machineId, []);
        }
        machineUsageMap.get(machineId)?.push(machinePart);
      });

      // Analyze each machine
      const problemMachinesData: MachinePartUsage[] = [];

      machineUsageMap.forEach((parts, machineId) => {
        const machine = machines.find(m => m.id === machineId);
        if (!machine) return;

        const venue = venues.find(v => v.id === machine.venue_id);
        
        // Count total parts used (considering quantity)
        const totalPartsUsed = parts.reduce((sum, part) => sum + part.quantity, 0);
        
        // Calculate total cost
        const totalCost = parts.reduce((sum, part) => {
          const cost = part.part?.cost_price || 0;
          return sum + (cost * part.quantity);
        }, 0);

        // Determine severity
        let severity: 'high' | 'medium' | 'low' = 'low';
        if (totalPartsUsed >= 5) {
          severity = 'high';
        } else if (totalPartsUsed >= 3) {
          severity = 'medium';
        }

        // Only include machines that used 3 or more parts
        if (totalPartsUsed >= 3) {
          problemMachinesData.push({
            machine_id: machineId,
            machine_name: machine.name,
            venue_name: venue?.name,
            part_count_12_months: totalPartsUsed,
            recent_parts: parts.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
            total_cost: totalCost,
            problem_severity: severity
          });
        }
      });

      // Sort by severity and part count
      problemMachinesData.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        if (severityOrder[a.problem_severity] !== severityOrder[b.problem_severity]) {
          return severityOrder[b.problem_severity] - severityOrder[a.problem_severity];
        }
        return b.part_count_12_months - a.part_count_12_months;
      });

      setProblemMachines(problemMachinesData);

      // Send notification if there are high-severity machines
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
          <p className="text-gray-500">Analyzing machine part usage...</p>
        </CardContent>
      </Card>
    );
  }

  if (problemMachines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-600" />
            Machine Problems Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-600 font-medium">✅ All machines are operating normally!</p>
          <p className="text-gray-500 text-sm mt-1">
            No machines have used 3+ parts in the last 12 months.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Machine Problems Alert
        </CardTitle>
        <p className="text-orange-700 text-sm">
          {problemMachines.length} machine(s) showing signs of problems (3+ parts used in 12 months)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {problemMachines.map((machine) => (
          <Card key={machine.machine_id} className="border">
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
                    {machine.problem_severity.toUpperCase()}
                  </Badge>
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
                <Button size="sm" variant="outline">
                  Schedule Maintenance
                </Button>
                <Button size="sm" variant="outline">
                  View Full History
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};

export default MachineProblemsTracker;