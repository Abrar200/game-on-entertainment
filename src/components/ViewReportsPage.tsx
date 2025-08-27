import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { Building2, FileText, QrCode, Search, Calendar, Filter, RefreshCw, Download, Printer, Check, X, Eye, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AutoBarcodeScanner from '@/components/AutoBarcodeScanner';
import { VenueReportTemplate, type MachineReportData } from '@/components/VenueReportTemplate';

interface MachineReport {
  id: string;
  machine_id: string;
  money_collected: number;
  current_toy_count: number;
  previous_toy_count: number;
  toys_dispensed: number;
  tokens_in_game: number;
  notes: string;
  report_date: string;
  paid_status?: boolean;
  machines?: {
    name: string;
    type: string;
    venue_id: string;
    serial_number?: string;
  };
  machine_name?: string;
  machine_type?: string;
  machine_serial?: string;
  venue_id: string;
}

interface VenueReport {
  id: string;
  venue_id: string;
  venue_name: string;
  venue_address?: string;
  total_revenue: number;
  venue_commission_percentage: number;
  venue_commission_amount: number;
  total_machines: number;
  total_reports: number;
  date_range_start: string;
  date_range_end: string;
  report_date: string;
  paid_status?: boolean;
  machine_data?: any;
}

interface ViewReportsPageProps {
  userProfile: {
    role: string;
    username?: string;
    full_name?: string;
    email: string;
  };
  hasPermission: (permission: string) => boolean;
}

const ViewReportsPage: React.FC<ViewReportsPageProps> = ({ userProfile, hasPermission }) => {
  const { venues = [], machines = [], companyLogo } = useAppContext();
  const { toast } = useToast();
  
  // State management
  const [machineReports, setMachineReports] = useState<MachineReport[]>([]);
  const [venueReports, setVenueReports] = useState<VenueReport[]>([]);
  const [filteredMachineReports, setFilteredMachineReports] = useState<MachineReport[]>([]);
  const [filteredVenueReports, setFilteredVenueReports] = useState<VenueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('machine-reports');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Scanner state
  const [showScanner, setShowScanner] = useState(false);

  // Permission check
  if (!hasPermission('view_financial_reports') && !hasPermission('view_earnings')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md w-full">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600 mb-4">
                  You don't have permission to view reports.
                </p>
                <p className="text-sm text-gray-500">
                  Contact your administrator to request access.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Fetch all reports
  const fetchAllReports = async () => {
    setLoading(true);
    try {
      console.log('📊 Fetching all reports...');

      // Fetch machine reports
      const { data: machineData, error: machineError } = await supabase
        .from('machine_reports')
        .select(`
          *,
          machines(name, type, venue_id, serial_number)
        `)
        .order('report_date', { ascending: false });

      if (machineError) {
        console.error('Machine reports error:', machineError);
        throw machineError;
      }

      // Enhance machine reports with venue data
      const enhancedMachineReports = machineData?.map(report => {
        const machine = report.machines;
        return {
          ...report,
          machine_name: machine?.name || report.machine_name || 'Deleted Machine',
          machine_type: machine?.type || report.machine_type || 'Unknown Type',
          machine_serial: machine?.serial_number || report.machine_serial || 'N/A',
          venue_id: machine?.venue_id || null
        };
      }) || [];

      setMachineReports(enhancedMachineReports);
      console.log('✅ Fetched machine reports:', enhancedMachineReports.length);

      // Fetch venue reports
      const { data: venueData, error: venueError } = await supabase
        .from('venue_reports')
        .select('*')
        .order('report_date', { ascending: false });

      if (venueError) {
        console.warn('Venue reports error (table may not exist):', venueError);
        setVenueReports([]);
      } else {
        setVenueReports(venueData || []);
        console.log('✅ Fetched venue reports:', venueData?.length || 0);
      }

    } catch (error) {
      console.error('❌ Error fetching reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch reports',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter reports
  const filterReports = () => {
    // Filter machine reports
    let filteredMachine = machineReports;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredMachine = filteredMachine.filter(report => {
        const machineName = report.machine_name?.toLowerCase() || '';
        const machineType = report.machine_type?.toLowerCase() || '';
        const machineSerial = report.machine_serial?.toLowerCase() || '';
        const venue = venues.find(v => v.id === report.venue_id);
        const venueName = venue?.name?.toLowerCase() || '';
        
        return machineName.includes(query) ||
               machineType.includes(query) ||
               machineSerial.includes(query) ||
               venueName.includes(query) ||
               report.id.toLowerCase().includes(query);
      });
    }

    if (selectedVenue !== 'all') {
      filteredMachine = filteredMachine.filter(report => report.venue_id === selectedVenue);
    }

    if (selectedMachine !== 'all') {
      filteredMachine = filteredMachine.filter(report => report.machine_id === selectedMachine);
    }

    if (paymentFilter !== 'all') {
      const isPaid = paymentFilter === 'paid';
      filteredMachine = filteredMachine.filter(report => Boolean(report.paid_status) === isPaid);
    }

    if (dateRange.start && dateRange.end) {
      filteredMachine = filteredMachine.filter(report => {
        const reportDate = new Date(report.report_date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return reportDate >= startDate && reportDate <= endDate;
      });
    }

    setFilteredMachineReports(filteredMachine);

    // Filter venue reports
    let filteredVenue = venueReports;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredVenue = filteredVenue.filter(report => 
        report.venue_name?.toLowerCase().includes(query) ||
        report.venue_address?.toLowerCase().includes(query) ||
        report.id.toLowerCase().includes(query)
      );
    }

    if (selectedVenue !== 'all') {
      filteredVenue = filteredVenue.filter(report => report.venue_id === selectedVenue);
    }

    if (paymentFilter !== 'all') {
      const isPaid = paymentFilter === 'paid';
      filteredVenue = filteredVenue.filter(report => Boolean(report.paid_status) === isPaid);
    }

    if (dateRange.start && dateRange.end) {
      filteredVenue = filteredVenue.filter(report => {
        const reportDate = new Date(report.report_date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return reportDate >= startDate && reportDate <= endDate;
      });
    }

    setFilteredVenueReports(filteredVenue);
  };

  // Handle barcode scan
  const handleScanResult = async (barcode: string) => {
    try {
      console.log('🔍 Scanning for machine:', barcode);
      
      // Find machine by barcode
      const machine = machines.find(m => 
        m.barcode?.toLowerCase() === barcode.toLowerCase() ||
        m.name.toLowerCase().includes(barcode.toLowerCase()) ||
        m.serial_number?.toLowerCase() === barcode.toLowerCase()
      );

      if (machine) {
        setSelectedMachine(machine.id);
        setActiveTab('machine-reports'); // Switch to machine reports tab
        toast({
          title: 'Machine Found!',
          description: `Filtering reports for ${machine.name}`
        });
      } else {
        toast({
          title: 'Machine Not Found',
          description: `No machine found with barcode: ${barcode}`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error finding machine:', error);
      toast({
        title: 'Error',
        description: 'Failed to find machine',
        variant: 'destructive'
      });
    }
    setShowScanner(false);
  };

  // Update paid status
  const updatePaidStatus = async (reportType: 'machine' | 'venue', reportId: string, newStatus: boolean) => {
    try {
      const tableName = reportType === 'machine' ? 'machine_reports' : 'venue_reports';
      
      const { error } = await supabase
        .from(tableName)
        .update({ paid_status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Report marked as ${newStatus ? 'paid' : 'unpaid'}`
      });

      // Refresh data
      fetchAllReports();
    } catch (error) {
      console.error('Error updating paid status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment status',
        variant: 'destructive'
      });
    }
  };

  // Generate Machine Report PDF using consistent template
  const generateMachineReportPDF = (report: MachineReport) => {
    const venue = venues.find(v => v.id === report.venue_id);
    const machine = machines.find(m => m.id === report.machine_id) || {
      name: report.machine_name,
      serial_number: report.machine_serial,
      type: report.machine_type
    };
    
    const totalCashPaywave = report.money_collected;
    const tokensInMachine = report.tokens_in_game || 0;
    const totalGameRevenue = totalCashPaywave;
    const venueCommissionPercent = venue?.commission_percentage || 30;
    const venueCommissionAmount = totalGameRevenue * (venueCommissionPercent / 100);
    
    // Use consistent styling with the existing machine report template from MachineReportViewer
    const logoElement = companyLogo ? 
      `<img src="${companyLogo}" alt="Game On Entertainment Logo" class="logo" style="width: 140px; height: 80px; object-fit: contain; margin-bottom: 5px;" />` :
      `<img src="/images/logo.jpg" alt="Game On Entertainment Logo" class="logo" style="width: 140px; height: 80px; object-fit: contain; margin-bottom: 5px;" />`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Machine Report - ${machine.name || 'Unknown'}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { 
            font-family: 'Arial', sans-serif; 
            margin: 0; 
            padding: 15px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            font-size: 14px;
            font-weight: bold;
          }
          .header { 
            position: relative;
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #dc2626; 
            padding-bottom: 15px; 
          }
          .company-branding {
            position: absolute;
            top: 0;
            right: 0;
            text-align: right;
            width: 200px;
          }
          .company-name {
            font-size: 16px;
            font-weight: bold;
            color: #dc2626;
            margin: 0;
          }
          .header h1 { 
            color: #dc2626; 
            margin: 0 0 8px 0;
            font-size: 22px;
            font-weight: bold;
          }
          .machine-info {
            margin: 15px 0;
            text-align: center;
            font-size: 13px;
            font-weight: bold;
          }
          .metrics-list {
            background: #fff;
            border: 2px solid #000;
            border-radius: 6px;
            padding: 20px;
            margin: 15px 0;
          }
          .metric-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #000;
            font-size: 14px;
            font-weight: bold;
          }
          .metric-item:last-child {
            border-bottom: none;
          }
          .metric-label {
            font-weight: bold;
            color: #000;
          }
          .metric-value {
            font-weight: bold;
            color: #dc2626;
            font-size: 16px;
          }
          .commission-notice {
            background: #f8f8f8;
            border: 2px solid #dc2626;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
            color: #000;
            font-size: 13px;
          }
          .token-notice {
            background: #e0f2fe;
            border: 2px solid #0288d1;
            border-radius: 6px;
            padding: 12px;
            margin: 15px 0;
            text-align: center;
            font-weight: bold;
            color: #01579b;
            font-size: 12px;
          }
          .payment-status {
            background: ${report.paid_status ? '#e8f5e8' : '#fff3cd'};
            border: 2px solid ${report.paid_status ? '#4caf50' : '#ffc107'};
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
            color: ${report.paid_status ? '#2e7d32' : '#f57c00'};
            font-size: 14px;
          }
          .footer {
            margin-top: 25px;
            text-align: center;
            font-size: 11px;
            color: #000;
            border-top: 1px solid #000;
            padding-top: 15px;
            font-weight: bold;
          }
          @media print { 
            button { display: none !important; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-branding">
            ${logoElement}
            <p class="company-name">Game On Entertainment</p>
          </div>
          <h1>Machine Report</h1>
          <div class="machine-info">
            <p><strong>Machine:</strong> ${machine.name || 'Unknown Machine'}</p>
            <p><strong>Serial Number:</strong> ${machine.serial_number || 'N/A'}</p>
            <p><strong>Venue:</strong> ${venue?.name || 'Unknown Venue'}</p>
            <p><strong>Address:</strong> ${venue?.address || 'N/A'}</p>
            <p><strong>Report Date:</strong> ${new Date(report.report_date).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div class="metrics-list">
          <div class="metric-item">
            <span class="metric-label">Total Cash / Paywave in Machine:</span>
            <span class="metric-value">$${totalCashPaywave.toFixed(2)}</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">Tokens in Machine:</span>
            <span class="metric-value">${tokensInMachine}</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">Total Game Revenue:</span>
            <span class="metric-value">$${totalGameRevenue.toFixed(2)}</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">Venue Commission %:</span>
            <span class="metric-value">${venueCommissionPercent}%</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">Venue Commission Amount:</span>
            <span class="metric-value">$${venueCommissionAmount.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="token-notice">
          <strong>Note:</strong> Commission on the "tokens in game" is paid via the token machine commission
        </div>
        
        <div class="commission-notice">
          <strong>Your commission will be paid into your nominated bank account within 3 business days</strong>
        </div>
        
        <div class="payment-status">
          <strong>Payment Status: ${report.paid_status ? 'PAID ✓' : 'PENDING PAYMENT'}</strong>
        </div>
        
        ${report.notes ? `
        <div style="background: #f8f8f8; padding: 15px; border: 1px solid #000; border-radius: 6px; margin: 15px 0; font-size: 13px; font-weight: bold;">
          <h3 style="margin-top: 0; color: #000; font-size: 14px; font-weight: bold;">Notes</h3>
          <p style="margin: 0; color: #000; font-weight: bold;">${report.notes}</p>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p><strong>Game On Entertainment</strong></p>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin-right: 10px;">Print Report</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #000; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Close</button>
        </div>
      </body>
      </html>
    `;

    // Open PDF in new window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 1000);
    } else {
      toast({
        title: 'Error',
        description: 'Pop-up blocked. Please allow pop-ups for printing.',
        variant: 'destructive'
      });
    }
  };

  // Generate Venue Report PDF using existing VenueReportTemplate
  const generateVenueReportPDF = async (report: VenueReport) => {
    try {
      console.log('📄 Generating venue report PDF using existing template...');

      const venue = venues.find(v => v.id === report.venue_id) || {
        id: report.venue_id,
        name: report.venue_name,
        address: report.venue_address,
        commission_percentage: report.venue_commission_percentage,
        image_url: null
      };

      const venueMachines = machines.filter(m => m.venue_id === report.venue_id);
      
      // Parse machine data from the stored report
      let machineReports: MachineReportData[] = [];
      
      if (report.machine_data) {
        try {
          const parsedData = typeof report.machine_data === 'string' 
            ? JSON.parse(report.machine_data) 
            : report.machine_data;
          
          if (Array.isArray(parsedData)) {
            machineReports = parsedData;
          }
        } catch (parseError) {
          console.warn('Failed to parse machine_data:', parseError);
        }
      }

      // If no machine data in report, create from venue machines
      if (machineReports.length === 0) {
        machineReports = venueMachines.map(machine => ({
          machine_id: machine.id,
          machine_name: machine.name,
          machine_serial: machine.serial_number || 'N/A',
          total_turnover: 0,
          total_tokens: 0,
          commission_amount: 0,
          report_count: 0,
          has_data: false
        }));
      }

      const dateRange = {
        start: report.date_range_start,
        end: report.date_range_end
      };

      // Use the existing VenueReportTemplate
      const reportTemplate = VenueReportTemplate({
        venue,
        machines: venueMachines,
        machineReports,
        reports: [], // Using machineReports instead
        dateRange,
        companyLogo
      });

      const htmlContent = reportTemplate.generateHTML();

      // Open in new window for printing
      const printWindow = window.open('', '_blank', 'width=1200,height=800');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 1000);
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

      toast({
        title: 'Success',
        description: 'Venue report generated successfully!'
      });

    } catch (error: any) {
      console.error('❌ Error generating venue report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate venue report',
        variant: 'destructive'
      });
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedVenue('all');
    setSelectedMachine('all');
    setPaymentFilter('all');
    setDateRange({ start: '', end: '' });
  };

  // Get available machines for filter
  const availableMachines = machines.filter(machine => 
    selectedVenue === 'all' || machine.venue_id === selectedVenue
  );

  // Calculate stats
  const activeReports = activeTab === 'machine-reports' ? filteredMachineReports : filteredVenueReports;
  const totalReports = activeReports.length;
  const paidReports = activeReports.filter((r: any) => r.paid_status).length;
  const totalRevenue = activeTab === 'machine-reports' 
    ? filteredMachineReports.reduce((sum, r) => sum + r.money_collected, 0)
    : filteredVenueReports.reduce((sum, r) => sum + r.total_revenue, 0);

  // Effects
  useEffect(() => {
    fetchAllReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [searchQuery, selectedVenue, selectedMachine, paymentFilter, dateRange, machineReports, venueReports]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">View Reports</h1>
            </div>
            <p className="text-gray-600">View and manage all machine and venue reports</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowScanner(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan Machine
            </Button>
            <Button 
              onClick={fetchAllReports}
              disabled={loading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{totalReports}</div>
              <div className="text-sm text-gray-600">Total Reports</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{paidReports}</div>
              <div className="text-sm text-gray-600">Paid Reports</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{totalReports - paidReports}</div>
              <div className="text-sm text-gray-600">Pending Payment</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">${totalRevenue.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Total Revenue</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                <SelectTrigger>
                  <SelectValue placeholder="All Venues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Venues</SelectItem>
                  {venues.map(venue => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                <SelectTrigger>
                  <SelectValue placeholder="All Machines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Machines</SelectItem>
                  {availableMachines.map(machine => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Pending Payment</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="w-full"
                  placeholder="Start Date"
                />
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="w-full"
                  placeholder="End Date"
                />
              </div>

              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="machine-reports">
              Machine Reports ({machineReports.length})
            </TabsTrigger>
            <TabsTrigger value="venue-reports">
              Venue Reports ({venueReports.length})
            </TabsTrigger>
          </TabsList>

          {/* Machine Reports Tab */}
          <TabsContent value="machine-reports">
            {loading ? (
              <Card>
                <CardContent className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Loading machine reports...</p>
                </CardContent>
              </Card>
            ) : filteredMachineReports.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Machine Reports Found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery || selectedVenue !== 'all' || selectedMachine !== 'all' || paymentFilter !== 'all' || dateRange.start || dateRange.end
                      ? 'Try adjusting your filters' 
                      : 'No machine reports have been generated yet'
                    }
                  </p>
                  {(searchQuery || selectedVenue !== 'all' || selectedMachine !== 'all' || paymentFilter !== 'all' || dateRange.start || dateRange.end) && (
                    <Button onClick={clearFilters}>Clear Filters</Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="grid gap-4">
                  {filteredMachineReports.map(report => {
                    const venue = venues.find(v => v.id === report.venue_id);
                    
                    return (
                      <Card key={report.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg">{report.machine_name}</h3>
                                {!report.machines && (
                                  <Badge variant="destructive" className="text-xs">Deleted</Badge>
                                )}
                                <Badge variant={report.paid_status ? 'default' : 'secondary'}>
                                  {report.paid_status ? 'Paid' : 'Pending'}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Venue:</span>
                                  <div className="font-medium">{venue?.name || 'Unknown Venue'}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Revenue:</span>
                                  <div className="font-medium text-green-600">${report.money_collected.toFixed(2)}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Tokens:</span>
                                  <div className="font-medium">{report.tokens_in_game || 0}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Date:</span>
                                  <div className="font-medium">{new Date(report.report_date).toLocaleDateString()}</div>
                                </div>
                              </div>
                              
                              <div className="mt-2 text-xs text-gray-500">
                                <span>Type: {report.machine_type}</span>
                                {report.machine_serial !== 'N/A' && (
                                  <span className="ml-4">Serial: {report.machine_serial}</span>
                                )}
                                <span className="ml-4">Toys: {report.toys_dispensed || 0}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateMachineReportPDF(report)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                              
                              <Button
                                size="sm"
                                variant={report.paid_status ? "default" : "outline"}
                                onClick={() => updatePaidStatus('machine', report.id, !report.paid_status)}
                                className={report.paid_status 
                                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                                  : 'border-orange-400 text-orange-600 hover:bg-orange-50'
                                }
                              >
                                {report.paid_status ? (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Paid
                                  </>
                                ) : (
                                  <>
                                    <X className="h-4 w-4 mr-1" />
                                    Mark Paid
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Venue Reports Tab */}
          <TabsContent value="venue-reports">
            {loading ? (
              <Card>
                <CardContent className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Loading venue reports...</p>
                </CardContent>
              </Card>
            ) : filteredVenueReports.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Venue Reports Found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery || selectedVenue !== 'all' || paymentFilter !== 'all' || dateRange.start || dateRange.end
                      ? 'Try adjusting your filters' 
                      : 'No venue reports have been generated yet'
                    }
                  </p>
                  {(searchQuery || selectedVenue !== 'all' || paymentFilter !== 'all' || dateRange.start || dateRange.end) && (
                    <Button onClick={clearFilters}>Clear Filters</Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="grid gap-4">
                  {filteredVenueReports.map(report => (
                    <Card key={report.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{report.venue_name}</h3>
                              <Badge variant={report.paid_status ? 'default' : 'secondary'}>
                                {report.paid_status ? 'Paid' : 'Pending'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Total Revenue:</span>
                                <div className="font-medium text-green-600">${report.total_revenue.toFixed(2)}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Commission ({report.venue_commission_percentage}%):</span>
                                <div className="font-medium text-blue-600">${report.venue_commission_amount.toFixed(2)}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Machines:</span>
                                <div className="font-medium">{report.total_machines}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Report Date:</span>
                                <div className="font-medium">{new Date(report.report_date).toLocaleDateString()}</div>
                              </div>
                            </div>
                            
                            <div className="mt-2 text-xs text-gray-500">
                              <span>Period: {new Date(report.date_range_start).toLocaleDateString()} - {new Date(report.date_range_end).toLocaleDateString()}</span>
                              <span className="ml-4">Reports: {report.total_reports}</span>
                              {report.venue_address && (
                                <span className="ml-4">Address: {report.venue_address}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateVenueReportPDF(report)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                            
                            <Button
                              size="sm"
                              variant={report.paid_status ? "default" : "outline"}
                              onClick={() => updatePaidStatus('venue', report.id, !report.paid_status)}
                              className={report.paid_status 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'border-orange-400 text-orange-600 hover:bg-orange-50'
                              }
                            >
                              {report.paid_status ? (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Paid
                                </>
                              ) : (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  Mark Paid
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {/* Barcode Scanner */}
        <AutoBarcodeScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleScanResult}
          scanMode="machine"
        />
      </div>
    </div>
  );
};

export default ViewReportsPage;