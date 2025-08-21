import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Calculator, ArrowLeft, FileText, Building2 } from 'lucide-react';
import MachineSelectInput from '@/components/MachineSelectInput';
import { VenueReportTemplate, type MachineReportData } from '@/components/VenueReportTemplate';

interface ReportGeneratorProps {
  restrictedMode?: 'maintenance_only' | 'manager';
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ restrictedMode }) => {
  const { machines = [], venues = [], setCurrentView, companyLogo, refreshData } = useAppContext();
  const { toast } = useToast();
  const [reportType, setReportType] = useState('machine');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('');
  const [tokensInGame, setTokensInGame] = useState('');
  const [toyMeterReading, setToyMeterReading] = useState('');
  const [machineTurnover, setMachineTurnover] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastMeterReading, setLastMeterReading] = useState(0);
  const [calculatedToysDispensed, setCalculatedToysDispensed] = useState(0);
  const [dateRange, setDateRange] = useState({ 
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (selectedMachine) {
      fetchLastMeterReading();
    }
  }, [selectedMachine]);

  useEffect(() => {
    if (toyMeterReading && lastMeterReading >= 0) {
      const current = parseInt(toyMeterReading) || 0;
      const previous = lastMeterReading || 0;
      const difference = current - previous;
      const dispensed = difference >= 0 ? difference : 0;
      setCalculatedToysDispensed(dispensed);
    }
  }, [toyMeterReading, lastMeterReading]);

  const fetchLastMeterReading = async () => {
    try {
      const { data, error } = await supabase
        .from('machine_reports')
        .select('current_toy_count')
        .eq('machine_id', selectedMachine)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data && !error) {
        setLastMeterReading(data.current_toy_count || 0);
      } else {
        setLastMeterReading(0);
      }
    } catch (error) {
      setLastMeterReading(0);
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const generateMachineReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine || !tokensInGame || !toyMeterReading || !machineTurnover) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    const machine = machines.find(m => m.id === selectedMachine);
    if (!machine) {
      toast({ title: 'Error', description: 'Selected machine not found', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const currentToyCount = parseInt(toyMeterReading) || 0;
      const previousToyCount = lastMeterReading || 0;
      
      const reportData = {
        machine_id: selectedMachine,
        money_collected: parseFloat(machineTurnover) || 0,
        current_toy_count: currentToyCount,
        previous_toy_count: previousToyCount,
        tokens_in_game: parseInt(tokensInGame) || 0,
        notes: notes.trim() || null,
        report_date: new Date().toISOString().split('T')[0]
      };

      const { error } = await supabase.from('machine_reports').insert([reportData]);
      if (error) {
        console.error('Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      toast({ title: 'Success', description: 'Machine report generated successfully!' });
      
      // Refresh data to update the reports list
      await refreshData();
      
      // Reset form
      setSelectedMachine('');
      setTokensInGame('');
      setToyMeterReading('');
      setMachineTurnover('');
      setNotes('');
      setLastMeterReading(0);
      setCalculatedToysDispensed(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Report generation error:', error);
      toast({ title: 'Error', description: `Failed to generate report: ${errorMessage}`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateVenueReport = async () => {
    if (!selectedVenue || !dateRange.start || !dateRange.end) {
      toast({ title: 'Error', description: 'Please select venue and date range', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const venue = venues.find(v => v.id === selectedVenue);
      if (!venue) throw new Error('Venue not found');

      console.log('📊 Generating venue report for:', venue.name);

      // Get machines for this venue
      const venueMachines = machines.filter(m => m.venue_id === selectedVenue);
      
      if (venueMachines.length === 0) {
        toast({
          title: 'Error',
          description: 'This venue has no machines assigned to it.',
          variant: 'destructive'
        });
        return;
      }

      // Fetch machine reports for the date range
      const { data: machineReports, error } = await supabase
        .from('machine_reports')
        .select('*')
        .in('machine_id', venueMachines.map(m => m.id))
        .gte('report_date', dateRange.start)
        .lte('report_date', dateRange.end);

      if (error) throw error;

      console.log('📊 Found machine reports:', machineReports?.length || 0);

      // Aggregate data by machine
      const machineReportSummaries: MachineReportData[] = venueMachines.map(machine => {
        const reportsForMachine = machineReports?.filter(r => r.machine_id === machine.id) || [];
        
        const totalTurnover = reportsForMachine.reduce((sum, report) => sum + (report.money_collected || 0), 0);
        const totalTokens = reportsForMachine.reduce((sum, report) => sum + (report.tokens_in_game || 0), 0);
        const commissionAmount = totalTurnover * (venue.commission_percentage / 100);

        return {
          machine_id: machine.id,
          machine_name: machine.name,
          machine_serial: machine.serial_number || 'N/A',
          total_turnover: totalTurnover,
          total_tokens: totalTokens,
          commission_amount: commissionAmount,
          report_count: reportsForMachine.length,
          has_data: reportsForMachine.length > 0
        };
      });

      const totalRevenue = machineReportSummaries.reduce((sum, m) => sum + m.total_turnover, 0);
      
      if (totalRevenue === 0) {
        toast({
          title: 'No Data Found',
          description: 'No machine reports found for this venue in the selected date range. Please ensure machine reports exist for this period.',
          variant: 'destructive'
        });
        return;
      }

      // Generate the report using the new template
      const reportTemplate = VenueReportTemplate({
        venue,
        machines: venueMachines,
        machineReports: machineReportSummaries,
        reports: [], // Using new system
        dateRange,
        companyLogo
      });

      const htmlContent = reportTemplate.generateHTML();

      // Open in new window
      const printWindow = window.open('', '_blank', 'width=1200,height=800');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 1000);
      }

      // Save to database
      const venueReportData = {
        venue_id: venue.id,
        venue_name: venue.name,
        venue_address: venue.address || '',
        total_revenue: totalRevenue,
        venue_commission_percentage: venue.commission_percentage,
        venue_commission_amount: totalRevenue * (venue.commission_percentage / 100),
        total_machines: venueMachines.length,
        total_reports: machineReportSummaries.reduce((sum, m) => sum + m.report_count, 0),
        date_range_start: dateRange.start,
        date_range_end: dateRange.end,
        report_date: new Date().toISOString().split('T')[0],
        paid_status: false,
        machine_data: JSON.stringify(machineReportSummaries)
      };

      await supabase.from('venue_reports').insert([venueReportData]);

      toast({ 
        title: 'Success', 
        description: `Venue report generated! Revenue: ${totalRevenue.toFixed(2)}, Commission: ${(totalRevenue * (venue.commission_percentage / 100)).toFixed(2)}` 
      });

    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to generate venue report', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold text-red-800">Generate Report</h2>
        </div>
      </div>
      
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <Calculator className="h-5 w-5" />
            Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <Label className="text-red-700 font-semibold">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="border-red-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="machine">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Machine Report
                    </div>
                  </SelectItem>
                  <SelectItem value="venue">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Venue Report
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === 'machine' && (
              <form onSubmit={generateMachineReport} className="space-y-6">
                <MachineSelectInput
                  value={selectedMachine}
                  onChange={setSelectedMachine}
                  label="Select Machine"
                  required
                />
                
                <div>
                  <Label htmlFor="tokensInGame" className="text-red-700 font-semibold">Tokens in Game *</Label>
                  <Input 
                    id="tokensInGame"
                    type="number" 
                    min="0" 
                    value={tokensInGame} 
                    onChange={(e) => setTokensInGame(e.target.value)} 
                    placeholder="Enter number of tokens visible in machine"
                    className="border-red-200 focus:border-red-500"
                    required
                  />
                </div>
                
                {lastMeterReading >= 0 && selectedMachine && (
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                    <Label className="text-sm text-blue-700">Last Toy Meter Reading: {lastMeterReading}</Label>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="toyMeterReading" className="text-red-700 font-semibold">Toy Meter Reading *</Label>
                  <Input 
                    id="toyMeterReading"
                    type="number" 
                    min="0" 
                    value={toyMeterReading} 
                    onChange={(e) => setToyMeterReading(e.target.value)} 
                    placeholder="Enter current toy meter reading"
                    className="border-red-200 focus:border-red-500"
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="toys" className="text-red-700 font-semibold">Toys Dispensed (Auto-calculated)</Label>
                  <Input 
                    id="toys"
                    type="number" 
                    value={calculatedToysDispensed} 
                    readOnly
                    className="bg-gray-50 border-red-200"
                    placeholder="Will be calculated automatically by database"
                  />
                </div>
                
                <div>
                  <Label htmlFor="turnover" className="text-red-700 font-semibold">Machine Turnover ($) *</Label>
                  <Input 
                    id="turnover"
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={machineTurnover} 
                    onChange={(e) => setMachineTurnover(e.target.value)} 
                    placeholder="Enter total money collected"
                    className="border-red-200 focus:border-red-500"
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes" className="text-red-700 font-semibold">Notes (Optional)</Label>
                  <Textarea 
                    id="notes"
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Add any additional notes or observations"
                    className="border-red-200 focus:border-red-500"
                    rows={3} 
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 text-lg"
                >
                  {loading ? 'Generating Report...' : '📋 Generate Machine Report'}
                </Button>
              </form>
            )}

            {reportType === 'venue' && (
              <div className="space-y-6">
                <div>
                  <Label className="text-red-700 font-semibold">Select Venue *</Label>
                  <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                    <SelectTrigger className="border-red-200">
                      <SelectValue placeholder="Choose a venue" />
                    </SelectTrigger>
                    <SelectContent>
                      {venues.map(venue => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.name} - {venue.commission_percentage}% commission
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate" className="text-red-700 font-semibold">Start Date *</Label>
                    <Input 
                      id="startDate"
                      type="date" 
                      value={dateRange.start} 
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="border-red-200 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-red-700 font-semibold">End Date *</Label>
                    <Input 
                      id="endDate"
                      type="date" 
                      value={dateRange.end} 
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="border-red-200 focus:border-red-500"
                      required
                    />
                  </div>
                </div>

                <Button 
                  onClick={generateVenueReport}
                  disabled={loading} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-lg"
                >
                  <Building2 className="h-5 w-5 mr-2" />
                  {loading ? 'Generating Venue Report...' : 'Generate Venue Report'}
                </Button>

                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">📊 How Venue Reports Work:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Data Source:</strong> Pulls from machine reports in the selected date range</li>
                    <li><strong>Revenue Calculation:</strong> Sums all machine turnover for the venue</li>
                    <li><strong>Commission:</strong> Applies venue commission percentage to total revenue</li>
                    <li><strong>Machine Breakdown:</strong> Shows individual machine performance with clear data</li>
                    <li><strong>Crystal Clear:</strong> Every dollar is accounted for and clearly displayed</li>
                    <li><strong>Data Validation:</strong> Shows which machines have reports vs. no data</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportGenerator;