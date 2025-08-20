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
import VenueReportTemplate from '@/components/VenueReportTemplate';
import { getImageUrl } from '@/lib/imageUtils';

interface VenueReportGeneratorProps {
  onBack?: () => void;
}

const VenueReportGenerator: React.FC<VenueReportGeneratorProps> = ({ onBack }) => {
  const { venues = [], machines = [], companyLogo, refreshData } = useAppContext();
  const { toast } = useToast();
  const [selectedVenue, setSelectedVenue] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const generateVenueReport = async () => {
    if (!selectedVenue || !dateRange.start || !dateRange.end) {
      toast({ 
        title: 'Error', 
        description: 'Please select venue and date range', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    try {
      const venue = venues.find(v => v.id === selectedVenue);
      if (!venue) throw new Error('Venue not found');

      console.log('📊 Generating venue report for:', venue.name);

      // Get machines for this venue
      const venueMachines = machines.filter(m => m.venue_id === selectedVenue);
      console.log('🎮 Found machines:', venueMachines.length);

      if (venueMachines.length === 0) {
        toast({
          title: 'No Machines',
          description: 'This venue has no machines assigned',
          variant: 'destructive'
        });
        return;
      }

      // Get machine reports for the date range
      const { data: reports, error } = await supabase
        .from('machine_reports')
        .select('*')
        .in('machine_id', venueMachines.map(m => m.id))
        .gte('report_date', dateRange.start)
        .lte('report_date', dateRange.end)
        .order('report_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching reports:', error);
        throw error;
      }

      console.log('📈 Found reports:', reports?.length || 0);

      if (!reports || reports.length === 0) {
        toast({
          title: 'No Data',
          description: 'No machine reports found for the selected date range',
          variant: 'destructive'
        });
        return;
      }

      // Calculate totals
      const totalRevenue = reports.reduce((sum, report) => sum + (report.money_collected || 0), 0);
      const venueCommissionAmount = totalRevenue * (venue.commission_percentage / 100);
      const totalTokens = reports.reduce((sum, report) => sum + (report.tokens_in_game || 0), 0);

      const reportSummary = {
        venue: {
          ...venue,
          image_url: getImageUrl(venue.image_url) // Ensure proper image URL
        },
        machines: venueMachines,
        reports,
        dateRange,
        companyLogo,
        totalRevenue,
        venueCommissionAmount,
        totalTokens,
        totalReports: reports.length
      };

      console.log('📊 Report summary:', {
        venue: venue.name,
        totalRevenue,
        venueCommissionAmount,
        totalReports: reports.length
      });

      // Save venue report to database
      const { data: savedReport, error: saveError } = await supabase
        .from('venue_reports')
        .insert([{
          venue_id: venue.id,
          venue_name: venue.name,
          venue_address: venue.address,
          total_revenue: totalRevenue,
          venue_commission_percentage: venue.commission_percentage,
          venue_commission_amount: venueCommissionAmount,
          total_machines: venueMachines.length,
          total_reports: reports.length,
          date_range_start: dateRange.start,
          date_range_end: dateRange.end,
          report_date: new Date().toISOString().split('T')[0],
          paid_status: false
        }])
        .select()
        .single();

      if (saveError) {
        console.error('❌ Error saving venue report:', saveError);
        // Continue anyway - don't fail the report generation
      } else {
        console.log('✅ Venue report saved to database:', savedReport);
      }

      // Generate and display the report
      const reportTemplate = VenueReportTemplate(reportSummary);
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
        description: `Venue report generated! Revenue: $${totalRevenue.toFixed(2)}, Commission: $${venueCommissionAmount.toFixed(2)}` 
      });

      // Refresh data to update any cached information
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

            {selectedVenue && dateRange.start && dateRange.end && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Report Preview</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Period:</span>
                    <div className="font-medium">
                      {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-green-700">Venue:</span>
                    <div className="font-medium">{selectedVenueData?.name}</div>
                  </div>
                  <div>
                    <span className="text-green-700">Commission:</span>
                    <div className="font-medium">{selectedVenueData?.commission_percentage}%</div>
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={generateVenueReport}
              disabled={loading || !selectedVenue || !dateRange.start || !dateRange.end} 
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
                <div className="text-sm text-purple-700">Reports Included</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {reportData.machines.length}
                </div>
                <div className="text-sm text-orange-700">Machines</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VenueReportGenerator;