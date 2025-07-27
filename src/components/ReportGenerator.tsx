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
import VenueReportTemplate from '@/components/VenueReportTemplate';
import ReportGeneratorPart2 from '@/components/ReportGeneratorPart2';

const ReportGenerator: React.FC = () => {
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
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

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

      const venueMachines = machines.filter(m => m.venue_id === selectedVenue);
      
      const { data: reports, error } = await supabase
        .from('machine_reports')
        .select('*')
        .in('machine_id', venueMachines.map(m => m.id))
        .gte('report_date', dateRange.start)
        .lte('report_date', dateRange.end)
        .order('report_date', { ascending: false });

      if (error) throw error;

      const reportTemplate = VenueReportTemplate({
        venue,
        machines: venueMachines,
        reports: reports || [],
        dateRange,
        companyLogo
      });

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(reportTemplate.generateHTML());
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }

      toast({ title: 'Success', description: 'Venue report generated successfully!' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Error', description: `Failed to generate venue report: ${errorMessage}`, variant: 'destructive' });
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
              <ReportGeneratorPart2
                venues={venues}
                selectedVenue={selectedVenue}
                setSelectedVenue={setSelectedVenue}
                dateRange={dateRange}
                setDateRange={setDateRange}
                generateVenueReport={generateVenueReport}
                loading={loading}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportGenerator;