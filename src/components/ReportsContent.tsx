import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Building2, FileText, Home, QrCode, Search } from 'lucide-react';
import MachineReportViewer from './MachineReportViewer';

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
  machines?: {
    name: string;
    type: string;
    venue_id: string;
    serial_number?: string;
  };
}

const ReportsContent: React.FC = () => {
  const { venues = [], machines = [], refreshData } = useAppContext();
  const navigate = useNavigate();
  const [machineReports, setMachineReports] = useState<MachineReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<MachineReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleScanBarcode = () => {
    navigate('/barcode-scanner');
  };

  const fetchMachineReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('machine_reports')
        .select('*, machines(name, type, venue_id, serial_number)')
        .order('report_date', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Fetched reports:', data);
      setMachineReports(data || []);
      setFilteredReports(data || []);
    } catch (error) {
      console.error('Error fetching machine reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReports = (query: string) => {
    if (!query.trim()) {
      setFilteredReports(machineReports);
      return;
    }

    const filtered = machineReports.filter(report => {
      const machine = report.machines;
      const venue = venues.find(v => v.id === machine?.venue_id);
      
      const searchFields = [
        machine?.name || '',
        machine?.type || '',
        machine?.serial_number || '',
        venue?.name || ''
      ].join(' ').toLowerCase();
      
      return searchFields.includes(query.toLowerCase());
    });
    
    setFilteredReports(filtered);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterReports(query);
  };

  useEffect(() => {
    fetchMachineReports();
  }, []);

  useEffect(() => {
    if (venues.length > 0 || machines.length > 0) {
      fetchMachineReports();
    }
  }, [venues, machines]);

  const reportsByVenue = filteredReports.reduce((acc, report) => {
    const machine = report.machines;
    const venue = venues.find(v => v.id === machine?.venue_id);
    const venueName = venue?.name || 'Unknown Venue';
    
    if (!acc[venueName]) {
      acc[venueName] = [];
    }
    acc[venueName].push(report);
    return acc;
  }, {} as Record<string, MachineReport[]>);

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
              <h1 className="text-3xl font-bold">Generated Reports</h1>
            </div>
          </div>
          <Button 
            onClick={handleScanBarcode}
            className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
          >
            <QrCode className="h-4 w-4" />
            Scan Barcode
          </Button>
        </div>
        
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by machine name, serial number, type, or venue..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 bg-white"
            />
          </div>
        </div>
        
        {loading ? (
          <Card>
            <CardContent className="text-center py-8">
              <p>Loading reports...</p>
            </CardContent>
          </Card>
        ) : filteredReports.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No Reports Found' : 'No Reports Generated'}
              </h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'Generate reports from the Machine Reports section'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[70vh]">
            <div className="space-y-4 pr-4">
              {Object.entries(reportsByVenue).map(([venueName, reports]) => {
                const venue = venues.find(v => v.name === venueName);
                return (
                  <Card key={venueName} className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Building2 className="h-4 w-4" />
                        {venueName}
                        <span className="text-sm font-normal text-gray-500">({reports.length})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-48">
                        <div className="space-y-3 pr-2">
                          {reports.map(report => {
                            const machine = report.machines;
                            return (
                              <div key={report.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm truncate">{machine?.name || 'Unknown Machine'}</h3>
                                    <p className="text-xs text-gray-500 truncate">{machine?.type || 'Unknown Type'}</p>
                                    {machine?.serial_number && (
                                      <p className="text-xs text-gray-400">SN: {machine.serial_number}</p>
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
                                    </div>
                                  </div>
                                  <div className="ml-2">
                                    <MachineReportViewer report={report} venue={venue} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export { ReportsContent };
export default ReportsContent;