import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Building2, FileText, Home, QrCode, Search, Calendar, Filter, RefreshCw } from 'lucide-react';
import MachineReportViewer from './MachineReportViewer';

interface MachineReport {
  venue_id: string;
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
  // Include deleted machine data
  machine_name?: string;
  machine_type?: string;
  machine_serial?: string;
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

const ReportsContent: React.FC = () => {
  const { venues = [], machines = [], refreshData } = useAppContext();
  const navigate = useNavigate();
  const [machineReports, setMachineReports] = useState<MachineReport[]>([]);
  const [venueReports, setVenueReports] = useState<VenueReport[]>([]);
  const [filteredMachineReports, setFilteredMachineReports] = useState<MachineReport[]>([]);
  const [filteredVenueReports, setFilteredVenueReports] = useState<VenueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activeTab, setActiveTab] = useState('machine-reports');

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleScanBarcode = () => {
    navigate('/barcode-scanner');
  };

  const fetchAllReports = async () => {
    setLoading(true);
    try {
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
      
      console.log('Fetched machine reports:', machineData?.length || 0);
      
      // Enhance machine reports with machine data even for deleted machines
      const enhancedMachineReports = machineData?.map(report => {
        const machine = report.machines;
        
        return {
          ...report,
          // If machine exists, use current data
          machine_name: machine?.name || report.machine_name || 'Deleted Machine',
          machine_type: machine?.type || report.machine_type || 'Unknown Type',
          machine_serial: machine?.serial_number || report.machine_serial || 'N/A',
          venue_id: machine?.venue_id || null
        };
      }) || [];
      
      setMachineReports(enhancedMachineReports);

      // Fetch venue reports
      const { data: venueData, error: venueError } = await supabase
        .from('venue_reports')
        .select('*')
        .order('report_date', { ascending: false });

      if (venueError) {
        console.warn('Venue reports error (table may not exist):', venueError);
        setVenueReports([]);
      } else {
        console.log('Fetched venue reports:', venueData?.length || 0);
        setVenueReports(venueData || []);
      }
      
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    // Filter machine reports
    let filteredMachine = machineReports;

    // Search filter
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
               venueName.includes(query);
      });
    }

    // Venue filter
    if (selectedVenue !== 'all') {
      filteredMachine = filteredMachine.filter(report => report.venue_id === selectedVenue);
    }

    // Machine filter
    if (selectedMachine !== 'all') {
      filteredMachine = filteredMachine.filter(report => report.machine_id === selectedMachine);
    }

    // Payment status filter
    if (paymentFilter !== 'all') {
      const isPaid = paymentFilter === 'paid';
      filteredMachine = filteredMachine.filter(report => Boolean(report.paid_status) === isPaid);
    }

    // Date range filter
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
        report.venue_address?.toLowerCase().includes(query)
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

  useEffect(() => {
    fetchAllReports();
  }, []);

  useEffect(() => {
    if (venues.length > 0 || machines.length > 0) {
      fetchAllReports();
    }
  }, [venues, machines]);

  useEffect(() => {
    filterReports();
  }, [searchQuery, selectedVenue, selectedMachine, paymentFilter, dateRange, machineReports, venueReports, venues]);

  const machineReportsByVenue = filteredMachineReports.reduce((acc, report) => {
    const venue = venues.find(v => v.id === report.venue_id);
    const venueName = venue?.name || 'Unknown/Deleted Venue';
    
    if (!acc[venueName]) {
      acc[venueName] = [];
    }
    acc[venueName].push(report);
    return acc;
  }, {} as Record<string, MachineReport[]>);

  const availableMachines = machines.filter(machine => 
    selectedVenue === 'all' || machine.venue_id === selectedVenue
  );

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedVenue('all');
    setSelectedMachine('all');
    setPaymentFilter('all');
    setDateRange({ start: '', end: '' });
  };

  // Calculate stats for active tab
  const activeReports = activeTab === 'machine-reports' ? filteredMachineReports : filteredVenueReports;
  const totalReports = activeReports.length;
  const paidReports = activeReports.filter((r: any) => r.paid_status).length;
  const totalRevenue = activeTab === 'machine-reports' 
    ? filteredMachineReports.reduce((sum, r) => sum + r.money_collected, 0)
    : filteredVenueReports.reduce((sum, r) => sum + r.total_revenue, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleBackToDashboard}
              className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold">All Reports</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={fetchAllReports}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={handleScanBarcode}
              className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
            >
              <QrCode className="h-4 w-4" />
              Scan Barcode
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                  className="pl-10 bg-white"
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

              <Button onClick={clearFilters} variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="machine-reports">Machine Reports ({machineReports.length})</TabsTrigger>
            <TabsTrigger value="venue-reports">Venue Reports ({venueReports.length})</TabsTrigger>
          </TabsList>

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
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery || selectedVenue !== 'all' || selectedMachine !== 'all' || paymentFilter !== 'all' || dateRange.start || dateRange.end ? 'No Machine Reports Found' : 'No Machine Reports Generated'}
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery || selectedVenue !== 'all' || selectedMachine !== 'all' || paymentFilter !== 'all' || dateRange.start || dateRange.end
                      ? 'Try adjusting your search terms or filters' 
                      : 'Generate reports from the Machine Reports section'
                    }
                  </p>
                  {(searchQuery || selectedVenue !== 'all' || selectedMachine !== 'all' || paymentFilter !== 'all' || dateRange.start || dateRange.end) && (
                    <Button onClick={clearFilters} className="mt-4">
                      Clear All Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[70vh]">
                <div className="space-y-4 pr-4">
                  {Object.entries(machineReportsByVenue).map(([venueName, reports]) => {
                    const venue = venues.find(v => v.name === venueName);
                    const venueReports = reports.length;
                    const venuePaidReports = reports.filter(r => r.paid_status).length;
                    const venueRevenue = reports.reduce((sum, r) => sum + r.money_collected, 0);
                    
                    return (
                      <Card key={venueName} className="shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <Building2 className="h-4 w-4" />
                              {venueName}
                              <Badge variant="outline" className="ml-2">
                                {venueReports} reports
                              </Badge>
                            </CardTitle>
                            <div className="flex gap-2">
                              <Badge variant={venuePaidReports === venueReports ? 'default' : 'secondary'}>
                                {venuePaidReports}/{venueReports} Paid
                              </Badge>
                              <Badge variant="outline">
                                ${venueRevenue.toFixed(2)}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-48">
                            <div className="space-y-3 pr-2">
                              {reports.map(report => (
                                <div key={report.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-medium text-sm truncate">
                                        {report.machine_name}
                                        {!report.machines && (
                                          <Badge variant="destructive" className="ml-2 text-xs">
                                            Deleted
                                          </Badge>
                                        )}
                                      </h3>
                                      <p className="text-xs text-gray-500 truncate">{report.machine_type}</p>
                                      {report.machine_serial && report.machine_serial !== 'N/A' && (
                                        <p className="text-xs text-gray-400">SN: {report.machine_serial}</p>
                                      )}
                                      <p className="text-xs text-gray-400">
                                        {new Date(report.report_date).toLocaleDateString()}
                                      </p>
                                      <div className="mt-1 flex items-center gap-3 text-xs">
                                        <span className="text-green-600 font-medium">
                                          ${report.money_collected.toFixed(2)}
                                        </span>
                                        <span className="text-orange-600">
                                          {report.tokens_in_game || 0} tokens
                                        </span>
                                        <Badge 
                                          variant={report.paid_status ? 'default' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {report.paid_status ? 'Paid' : 'Pending'}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="ml-2">
                                      <MachineReportViewer report={report} venue={venue} />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

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
                  <p className="text-gray-600">Generate venue reports from the Reports section</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[70vh]">
                <div className="space-y-4 pr-4">
                  {filteredVenueReports.map(report => {
                    const venue = venues.find(v => v.id === report.venue_id);
                    return (
                      <Card key={report.id} className="shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <Building2 className="h-4 w-4" />
                              {report.venue_name}
                              <Badge variant="outline" className="ml-2">
                                {new Date(report.date_range_start).toLocaleDateString()} - {new Date(report.date_range_end).toLocaleDateString()}
                              </Badge>
                            </CardTitle>
                            <div className="flex gap-2">
                              <Badge variant={report.paid_status ? 'default' : 'secondary'}>
                                {report.paid_status ? 'Paid' : 'Pending'}
                              </Badge>
                              <Badge variant="outline">
                                ${report.total_revenue.toFixed(2)}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Total Revenue:</span>
                              <div className="font-semibold text-green-600">${report.total_revenue.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Commission ({report.venue_commission_percentage}%):</span>
                              <div className="font-semibold text-blue-600">${report.venue_commission_amount.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Machines:</span>
                              <div className="font-semibold">{report.total_machines}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Report Date:</span>
                              <div className="font-semibold">{new Date(report.report_date).toLocaleDateString()}</div>
                            </div>
                          </div>
                          {report.venue_address && (
                            <p className="text-xs text-gray-500 mt-2">{report.venue_address}</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export { ReportsContent };
export default ReportsContent;