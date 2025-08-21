import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Calculator, ArrowLeft, FileText, Building2, DollarSign } from 'lucide-react';
import { VenueReportTemplate } from '@/components/VenueReportTemplate';

interface VenueReportGeneratorProps {
  onBack?: () => void;
}

interface MachineReportData {
  machine_id: string;
  machine_name: string;
  turnover: number;
  tokens: number;
  commission: number;
}

const VenueReportGenerator: React.FC<VenueReportGeneratorProps> = ({ onBack }) => {
  const { venues = [], machines = [], companyLogo, refreshData } = useAppContext();
  const { toast } = useToast();
  const [selectedVenue, setSelectedVenue] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [machineReports, setMachineReports] = useState<MachineReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Initialize machine reports when venue is selected
  useEffect(() => {
    if (selectedVenue) {
      const venueMachines = machines.filter(m => m.venue_id === selectedVenue);
      const initialReports: MachineReportData[] = venueMachines.map(machine => ({
        machine_id: machine.id,
        machine_name: machine.name,
        turnover: 0,
        tokens: 0,
        commission: 0
      }));
      setMachineReports(initialReports);
    }
  }, [selectedVenue, machines]);

  const updateMachineReport = (machineId: string, field: keyof MachineReportData, value: number) => {
    setMachineReports(prev => prev.map(report => 
      report.machine_id === machineId ? { ...report, [field]: value } : report
    ));
  };

  const calculateCommission = (machineId: string, turnover: number) => {
    const venue = venues.find(v => v.id === selectedVenue);
    if (!venue) return 0;
    
    const commission = turnover * (venue.commission_percentage / 100);
    updateMachineReport(machineId, 'commission', commission);
    return commission;
  };

  const generateVenueReport = async () => {
    if (!selectedVenue || !dateRange.start || !dateRange.end) {
      toast({ 
        title: 'Error', 
        description: 'Please select venue and date range', 
        variant: 'destructive' 
      });
      return;
    }

    // Validate that at least one machine has turnover data
    const totalTurnover = machineReports.reduce((sum, report) => sum + report.turnover, 0);
    if (totalTurnover === 0) {
      toast({
        title: 'Error',
        description: 'Please enter turnover amounts for at least one machine',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const venue = venues.find(v => v.id === selectedVenue);
      if (!venue) throw new Error('Venue not found');

      console.log('📊 Generating venue report for:', venue.name);

      const venueMachines = machines.filter(m => m.venue_id === selectedVenue);
      
      const totalCommission = machineReports.reduce((sum, report) => sum + report.commission, 0);
      const totalTokens = machineReports.reduce((sum, report) => sum + report.tokens, 0);

      const reportSummary = {
        venue: {
          ...venue,
          image_url: venue.image_url || null
        },
        machines: venueMachines,
        machineReports: machineReports,
        dateRange,
        companyLogo,
        totalRevenue: totalTurnover,
        venueCommissionAmount: totalCommission,
        totalTokens,
        totalReports: machineReports.filter(r => r.turnover > 0).length
      };

      console.log('📊 Report summary:', {
        venue: venue.name,
        totalRevenue: totalTurnover,
        venueCommissionAmount: totalCommission,
        totalReports: reportSummary.totalReports
      });

      // Save venue report to database
      const venueReportData = {
        venue_id: venue.id,
        venue_name: venue.name,
        venue_address: venue.address || '',
        total_revenue: totalTurnover,
        venue_commission_percentage: venue.commission_percentage,
        venue_commission_amount: totalCommission,
        total_machines: venueMachines.length,
        total_reports: reportSummary.totalReports,
        date_range_start: dateRange.start,
        date_range_end: dateRange.end,
        report_date: new Date().toISOString().split('T')[0],
        paid_status: false,
        machine_data: JSON.stringify(machineReports)
      };

      const { data: savedReport, error: saveError } = await supabase
        .from('venue_reports')
        .insert([venueReportData])
        .select()
        .single();

      if (saveError) {
        console.error('❌ Error saving venue report:', saveError);
        // Continue anyway - don't fail the report generation
      } else {
        console.log('✅ Venue report saved to database:', savedReport);
      }

      // Generate and display the report
      const reportTemplate = VenueReportTemplate({
        ...reportSummary,
        reports: [], // We're using machineReports instead
      });
      const htmlContent = reportTemplate.generateHTML();

      // Open in new window for printing
      const printWindow = window.open('', '_blank', 'width=1000,height=800');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Auto-print after a delay
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      } else {
        // Fallback: download as HTML file
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `venue-report-${venue.name}-${dateRange.start}-${dateRange.end}.html`;
        link.click();
        URL.revokeObjectURL(url);
      }

      setReportData(reportSummary);

      toast({ 
        title: 'Success', 
        description: `Venue report generated! Revenue: $${totalTurnover.toFixed(2)}, Commission: $${totalCommission.toFixed(2)}` 
      });

      await refreshData();

    } catch (error: any) {
      console.error('❌ Error generating venue report:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to generate venue report', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedVenueData = venues.find(v => v.id === selectedVenue);
  const totalTurnover = machineReports.reduce((sum, report) => sum + report.turnover, 0);
  const totalCommission = machineReports.reduce((sum, report) => sum + report.commission, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button 
              variant="outline" 
              onClick={onBack}
              className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <h2 className="text-2xl font-bold text-blue-800">Generate Venue Report</h2>
        </div>
      </div>
      
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Building2 className="h-5 w-5" />
            Venue Commission Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <Label className="text-blue-700 font-semibold">Select Venue *</Label>
              <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                <SelectTrigger className="border-blue-200">
                  <SelectValue placeholder="Choose a venue" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map(venue => (
                    <SelectItem key={venue.id} value={venue.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{venue.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {venue.commission_percentage}% commission
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedVenueData && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-700">Commission Rate:</span>
                      <div className="text-blue-600">{selectedVenueData.commission_percentage}%</div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Machines:</span>
                      <div className="text-blue-600">
                        {machines.filter(m => m.venue_id === selectedVenue).length} machines
                      </div>
                    </div>
                  </div>
                  {selectedVenueData.address && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-blue-700">Address:</span>
                      <div className="text-blue-600">{selectedVenueData.address}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-blue-700 font-semibold">Start Date *</Label>
                <Input 
                  id="startDate"
                  type="date" 
                  value={dateRange.start} 
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="border-blue-200 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-blue-700 font-semibold">End Date *</Label>
                <Input 
                  id="endDate"
                  type="date" 
                  value={dateRange.end} 
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="border-blue-200 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Machine Turnover Inputs */}
            {selectedVenue && machineReports.length > 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">Machine Turnover Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {machineReports.map((report) => (
                    <div key={report.machine_id} className="grid grid-cols-4 gap-4 p-4 bg-white rounded-lg border">
                      <div>
                        <Label className="font-medium">{report.machine_name}</Label>
                      </div>
                      <div>
                        <Label className="text-sm">Turnover ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={report.turnover || ''}
                          onChange={(e) => {
                            const turnover = parseFloat(e.target.value) || 0;
                            updateMachineReport(report.machine_id, 'turnover', turnover);
                            calculateCommission(report.machine_id, turnover);
                          }}
                          placeholder="0.00"
                          className="border-green-200"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Tokens</Label>
                        <Input
                          type="number"
                          min="0"
                          value={report.tokens || ''}
                          onChange={(e) => updateMachineReport(report.machine_id, 'tokens', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="border-green-200"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Commission</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={report.commission.toFixed(2)}
                          readOnly
                          className="bg-gray-100 border-gray-300"
                        />
                      </div>
                    </div>
                  ))}
                  
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">${totalTurnover.toFixed(2)}</div>
                      <div className="text-sm text-blue-700">Total Turnover</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">${totalCommission.toFixed(2)}</div>
                      <div className="text-sm text-green-700">Total Commission</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{selectedVenueData?.commission_percentage}%</div>
                      <div className="text-sm text-purple-700">Commission Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button 
              onClick={generateVenueReport}
              disabled={loading || !selectedVenue || !dateRange.start || !dateRange.end || totalTurnover === 0} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-lg"
            >
              <Building2 className="h-5 w-5 mr-2" />
              {loading ? 'Generating Report...' : 'Generate Venue Commission Report'}
            </Button>

            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium mb-2">Report includes:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Total revenue from all machines in the venue</li>
                <li>Commission calculation based on venue percentage</li>
                <li>Individual machine performance breakdown</li>
                <li>Token count and payment status tracking</li>
                <li>Professional PDF format for printing and records</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Report Generated Successfully</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  ${reportData.totalRevenue.toFixed(2)}
                </div>
                <div className="text-sm text-green-700">Total Revenue</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  ${reportData.venueCommissionAmount.toFixed(2)}
                </div>
                <div className="text-sm text-blue-700">Venue Commission</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {reportData.totalReports}
                </div>
                <div className="text-sm text-purple-700">Machines Reported</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {reportData.machines.length}
                </div>
                <div className="text-sm text-orange-700">Total Machines</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VenueReportGenerator;