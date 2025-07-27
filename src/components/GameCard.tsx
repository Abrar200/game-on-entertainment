import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, DollarSign, FileText, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import PayoutCalculator from './PayoutCalculator';

interface GameCardProps {
  id: string;
  name: string;
  type: string;
  location: string;
  revenue: number;
  status: string;
  plays?: number;
  lastMaintenance?: string;
}

const GameCard = ({ id, name, type, location, revenue, status }: GameCardProps) => {
  const { toast } = useToast();
  const { machines, getLatestReport } = useAppContext();
  
  const machine = machines.find(m => m.id === id);
  const latestReport = getLatestReport(id);
  
  // Calculate display values from latest report
  const displayRevenue = latestReport?.money_collected || revenue;
  const toysDispensed = latestReport?.toys_dispensed || 0;
  let prizeValueDispensed = latestReport?.prize_value || 0;
  
  // If prize_value is 0 but toys were dispensed, calculate it
  if (prizeValueDispensed === 0 && toysDispensed > 0 && machine?.current_prize) {
    prizeValueDispensed = toysDispensed * parseFloat(machine.current_prize.cost.toString());
  }
  
  // If toys_dispensed is 0, try to calculate from counter difference
  let actualToysDispensed = toysDispensed;
  if (actualToysDispensed === 0 && latestReport?.current_toy_count !== null && latestReport?.previous_toy_count !== null) {
    actualToysDispensed = Math.max(0, latestReport.current_toy_count - latestReport.previous_toy_count);
    
    // Recalculate prize value with correct toys dispensed
    if (actualToysDispensed > 0 && machine?.current_prize) {
      prizeValueDispensed = actualToysDispensed * parseFloat(machine.current_prize.cost.toString());
    }
  }
  
  const statusColors = {
    Active: 'bg-green-500',
    Maintenance: 'bg-yellow-500',
    Inactive: 'bg-red-500'
  };

  const generateReport = async () => {
    try {
      const reportData = {
        machine_id: id,
        machine_name: name,
        venue: location,
        type: type,
        status: status,
        revenue: displayRevenue,
        generated_at: new Date().toISOString(),
        report_type: 'machine_specific'
      };

      const { error } = await supabase
        .from('machine_reports')
        .insert([reportData]);

      if (error) throw error;

      toast({
        title: "Report Generated",
        description: `Report for ${name} has been generated and saved.`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-purple-300">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold text-purple-800">{name}</CardTitle>
          <Badge className={`${statusColors[status as keyof typeof statusColors] || 'bg-gray-500'} text-white`}>
            {status}
          </Badge>
        </div>
        <Badge variant="outline" className="w-fit">
          {type}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            {location}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-green-600 font-semibold">
              <DollarSign className="w-4 h-4 mr-1" />
              ${displayRevenue.toLocaleString()}
              {latestReport && (
                <span className="text-xs text-gray-500 ml-1">(Latest Report)</span>
              )}
            </div>
            <Button 
              size="sm" 
              onClick={generateReport}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <FileText className="w-4 h-4 mr-1" />
              Generate Report
            </Button>
          </div>
          <PayoutCalculator machineId={id} />
          {machine?.current_prize && (
            <div className="flex items-center text-sm text-orange-600">
              <Gift className="w-4 h-4 mr-2" />
              Current Prize: {machine.current_prize.name}
            </div>
          )}
          {!machine?.current_prize && (
            <div className="flex items-center text-sm text-gray-500">
              <Gift className="w-4 h-4 mr-2" />
              No prize assigned
            </div>
          )}
          {latestReport && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
              <div>Latest Report Data:</div>
              <div>Toys Dispensed: {actualToysDispensed} | Prize Value: ${prizeValueDispensed.toFixed(2)}</div>
              <div>Money Collected: ${displayRevenue.toFixed(2)}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GameCard;