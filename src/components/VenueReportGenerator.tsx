import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Calculator, ArrowLeft, Building2, DollarSign, Calendar, FileCheck, AlertTriangle } from 'lucide-react';
import { VenueReportTemplate, type MachineReportData } from '@/components/VenueReportTemplate';

interface VenueReportGeneratorProps {
  onBack?: () => void;
}

interface VenueReportData {
  venue: any;
  dateRange: { start: string; end: string };
  machineReports: MachineReportData[];
  totalRevenue: number;
  totalCommission: number;
  totalTokens: number;
  totalMachines: number;
  machinesWithData: number;
}

const VenueReportGenerator: React.FC<VenueReportGeneratorProps> = ({ onBack }) => {
  const { venues = [], machines = [], companyLogo, refreshData } = useAppContext();
  const { toast } = useToast();
  const [selectedVenue, setSelectedVenue] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState<VenueReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Automatically analyze when venue or date range changes
  useEffect(() => {
    if (selectedVenue && dateRange.start && dateRange.end) {
      analyzeVenueData();
    } else {
      setReportData(null);
    }
  }, [selectedVenue, dateRange]);

  const analyzeVenueData = async () => {
    if (!selectedVenue || !dateRange.start || !dateRange.end) return;

    setAnalyzing(true);
    try {
      console.log('📊 Analyzing venue data for:', selectedVenue, 'from', dateRange.start, 'to', dateRange.end);

      const venue = venues.find(v => v.id === selectedVenue);
      if (!venue) throw new Error('Venue not found');

      // Get all machines for this venue
      const venueMachines = machines.filter(m => m.venue_id === selectedVenue);
      console.log('🎮 Found machines for venue:', venueMachines.length);

      if (venueMachines.length === 0) {
        toast({
          title: 'No Machines',
          description: 'This venue has no machines assigned to it.',
          variant: 'destructive'
        });
        setReportData(null);
        return;
      }

      // Fetch machine reports for the date range using report_date field
      console.log('🔍 Fetching machine reports with query:');
      console.log('WHERE machine_id IN', venueMachines.map(m => m.id));
      console.log('AND report_date >=', dateRange.start);
      console.log('AND report_date <=', dateRange.end);

      const { data: machineReports, error } = await supabase
        .from('machine_reports')
        .select('*')
        .in('machine_id', venueMachines.map(m => m.id))
        .gte('report_date', dateRange.start)
        .lte('report_date', dateRange.end)
        .order('report_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching machine reports:', error);
        throw error;
      }

      console.log('📊 Found machine reports:', machineReports?.length || 0);
      
      // Log sample reports for debugging
      if (machineReports && machineReports.length > 0) {
        console.log('📋 Sample report:', {
          machine_id: machineReports[0].machine_id,
          report_date: machineReports[0].report_date,
          money_collected: machineReports[0].money_collected,
          tokens_in_game: machineReports[0].tokens_in_game
        });
      }

      // Aggregate data by machine
      const machineReportSummaries: MachineReportData[] = venueMachines.map(machine => {
        const reportsForMachine = machineReports?.filter(r => r.machine_id === machine.id) || [];
        
        console.log(`🎰 Machine ${machine.name}: found ${reportsForMachine.length} reports in date range`);
        
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

      // Calculate totals
      const totalRevenue = machineReportSummaries.reduce((sum, m) => sum + m.total_turnover, 0);
      const totalCommission = machineReportSummaries.reduce((sum, m) => sum + m.commission_amount, 0);
      const totalTokens = machineReportSummaries.reduce((sum, m) => sum + m.total_tokens, 0);
      const machinesWithData = machineReportSummaries.filter(m => m.has_data).length;

      const reportData: VenueReportData = {
        venue,
        dateRange,
        machineReports: machineReportSummaries,
        totalRevenue,
        totalCommission,
        totalTokens,
        totalMachines: venueMachines.length,
        machinesWithData
      };

      setReportData(reportData);

      console.log('✅ Venue analysis complete:', {
        totalRevenue: totalRevenue.toFixed(2),
        totalCommission: totalCommission.toFixed(2),
        machinesWithData: `${machinesWithData}/${venueMachines.length}`,
        dateRange: `${dateRange.start} to ${dateRange.end}`
      });

    } catch (error: any) {
      console.error('❌ Error analyzing venue data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to analyze venue data',
        variant: 'destructive'
      });
      setReportData(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateVenueReport = async () => {
    if (!reportData) {
      toast({
        title: 'Error',
        description: 'No venue data available to generate report',
        variant: 'destructive'
      });
      return;
    }

    if (reportData.totalRevenue === 0) {
      toast({
        title: 'No Revenue Data',
        description: `No machine reports found for this venue between ${dateRange.start} and ${dateRange.end}. Please ensure machine reports exist for this period.`,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      console.log('📄 Generating venue report...');

      // Save venue report to database
      const venueReportData = {
        venue_id: reportData.venue.id,
        venue_name: reportData.venue.name,
        venue_address: reportData.venue.address || '',
        total_revenue: reportData.totalRevenue,
        venue_commission_percentage: reportData.venue.commission_percentage,
        venue_commission_amount: reportData.totalCommission,
        total_machines: reportData.totalMachines,
        total_reports: reportData.machineReports.reduce((sum, m) => sum + m.report_count, 0),
        date_range_start: reportData.dateRange.start,
        date_range_end: reportData.dateRange.end,
        report_date: new Date().toISOString().split('T')[0],
        paid_status: false,
        machine_data: JSON.stringify(reportData.machineReports),
        notes: `Generated from ${reportData.machinesWithData} machines with data out of ${reportData.totalMachines} total machines. Date range: ${reportData.dateRange.start} to ${reportData.dateRange.end}`
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

      // Generate and display the report using the fixed template
      const reportTemplate = VenueReportTemplate({
        venue: reportData.venue,
        machines: machines.filter(m => m.venue_id === selectedVenue),
        machineReports: reportData.machineReports,
        reports: [], // We're using machineReports instead
        dateRange: reportData.dateRange,
        companyLogo
      });

      const htmlContent = reportTemplate.generateHTML();

      // Open in new window for printing
      const printWindow = window.open('', '_blank', 'width=1200,height=800');
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
        link.download = `venue-report-${reportData.venue.name}-${reportData.dateRange.start}-${reportData.dateRange.end}.html`;
        link.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: 'Success',
        description: `Venue report generated! Total Revenue: $${reportData.totalRevenue.toFixed(2)}, Commission: $${reportData.totalCommission.toFixed(2)}`
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
            {/* Venue Selection */}
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

            {/* Date Range */}
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
                <p className="text-xs text-gray-500 mt-1">
                  Will include machine reports from this date onwards
                </p>
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
                <p className="text-xs text-gray-500 mt-1">
                  Will include machine reports up to this date
                </p>
              </div>
            </div>

            {/* Analysis Status */}
            {analyzing && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 animate-spin text-yellow-600" />
                  <span className="font-medium text-yellow-800">Analyzing venue data...</span>
                  <span className="text-sm text-yellow-700">
                    Checking machine reports from {dateRange.start} to {dateRange.end}
                  </span>
                </div>
              </div>
            )}

            {/* Report Preview */}
            {reportData && !analyzing && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Report Preview - {reportData.venue.name}
                  </CardTitle>
                  <p className="text-sm text-green-700">
                    Data from machine reports between {reportData.dateRange.start} and {reportData.dateRange.end}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-white rounded-lg border">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        ${reportData.totalRevenue.toFixed(2)}
                      </div>
                      <div className="text-sm text-green-700">Total Revenue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        ${reportData.totalCommission.toFixed(2)}
                      </div>
                      <div className="text-sm text-blue-700">Commission ({reportData.venue.commission_percentage}%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {reportData.totalTokens}
                      </div>
                      <div className="text-sm text-purple-700">Total Tokens</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {reportData.machinesWithData}/{reportData.totalMachines}
                      </div>
                      <div className="text-sm text-orange-700">Machines with Data</div>
                    </div>
                  </div>

                  {/* Machine Breakdown */}
                  <div>
                    <h4 className="font-semibold text-green-800 mb-3">
                      Machine Performance Breakdown ({reportData.dateRange.start} to {reportData.dateRange.end})
                    </h4>
                    <div className="space-y-2">
                      {reportData.machineReports.map((machine) => (
                        <div key={machine.machine_id} className="grid grid-cols-5 gap-4 p-3 bg-white rounded border text-sm">
                          <div>
                            <div className="font-medium">{machine.machine_name}</div>
                            <div className="text-gray-500 text-xs">SN: {machine.machine_serial}</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">${machine.total_turnover.toFixed(2)}</div>
                            <div className="text-gray-500 text-xs">Turnover</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{machine.total_tokens}</div>
                            <div className="text-gray-500 text-xs">Tokens</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">${machine.commission_amount.toFixed(2)}</div>
                            <div className="text-gray-500 text-xs">Commission</div>
                          </div>
                          <div className="text-center">
                            {machine.has_data ? (
                              <Badge variant="default" className="text-xs">
                                {machine.report_count} reports
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                No reports
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Warnings */}
                  {reportData.machinesWithData < reportData.totalMachines && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-yellow-800">
                          Warning: {reportData.totalMachines - reportData.machinesWithData} machines have no reports between {reportData.dateRange.start} and {reportData.dateRange.end}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Generate Button */}
            <Button 
              onClick={generateVenueReport}
              disabled={loading || !reportData || reportData.totalRevenue === 0} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-lg"
            >
              <Building2 className="h-5 w-5 mr-2" />
              {loading ? 'Generating Report...' : 'Generate Venue Commission Report'}
            </Button>

            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium mb-2">📊 How Date Filtering Works:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Data Source:</strong> Machine reports with individual report_date fields</li>
                <li><strong>Filter Logic:</strong> WHERE report_date &gt;= start_date AND report_date &lt;= end_date</li>
                <li><strong>Aggregation:</strong> Sums money_collected and tokens_in_game for each machine</li>
                <li><strong>Commission:</strong> Applied to total revenue from all filtered reports</li>
                <li><strong>Crystal Clear:</strong> Shows which machines have reports vs. no data in the date range</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueReportGenerator;