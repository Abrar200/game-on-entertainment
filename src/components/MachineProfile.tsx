import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, MapPin, Calendar, Wrench, DollarSign, FileText, Gift, TrendingUp, Loader2 } from 'lucide-react';
import { MachineBarcodeDisplay } from './MachineBarcodeDisplay';
import { MachineEditDialog } from './MachineEditDialog';
import { ServiceScheduleDialog } from './ServiceScheduleDialog';
import { ReportsContent } from './ReportsContent';
import MachineReportForm from './MachineReportForm';
import AddPrizesToMachine from './AddPrizesToMachine';
import PayWaveDisplay from './PayWaveDisplay';
import { createImageWithFallback } from '@/lib/imageUtils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Machine {
  id: string;
  name: string;
  type: string;
  serial_number?: string;
  barcode?: string;
  status: string;
  last_serviced?: string;
  total_earnings?: number;
  image_url?: string;
  venue?: {
    name: string;
    address?: string;
  };
}

interface MachineProfileProps {
  machine: Machine;
  onClose: () => void;
}

interface MachineStats {
  totalEarnings: number;
  totalReports: number;
  lastReport: string | null;
  lastServiced: string | null;
  toysDispensed: number;
  averagePayout: number | null;
  loading: boolean;
}

export const MachineProfile: React.FC<MachineProfileProps> = ({ machine, onClose }) => {
  const { toast } = useToast();
  const [showReports, setShowReports] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [showAddPrizes, setShowAddPrizes] = useState(false);
  const [machineStats, setMachineStats] = useState<MachineStats>({
    totalEarnings: 0,
    totalReports: 0,
    lastReport: null,
    lastServiced: null,
    toysDispensed: 0,
    averagePayout: null,
    loading: true
  });

  useEffect(() => {
    fetchMachineStats();
  }, [machine.id]);

  const fetchMachineStats = async () => {
    try {
      setMachineStats(prev => ({ ...prev, loading: true }));
      console.log('📊 Fetching stats for machine:', machine.name);

      // Fetch machine reports
      const { data: reports, error: reportsError } = await supabase
        .from('machine_reports')
        .select('money_collected, toys_dispensed, prize_value, report_date, created_at')
        .eq('machine_id', machine.id)
        .order('created_at', { ascending: false });

      if (reportsError) {
        console.error('❌ Error fetching reports:', reportsError);
        throw reportsError;
      }

      // Fetch machine maintenance/service records
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('created_at, status')
        .eq('machine_id', machine.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (jobsError) {
        console.warn('⚠️ Error fetching jobs (may not exist):', jobsError);
      }

      // Calculate statistics
      const totalEarnings = reports?.reduce((sum, report) => sum + (report.money_collected || 0), 0) || 0;
      const totalToysDispensed = reports?.reduce((sum, report) => sum + (report.toys_dispensed || 0), 0) || 0;
      
      // Calculate average payout percentage
      let averagePayout: number | null = null;
      if (reports && reports.length > 0) {
        const payoutPercentages = reports
          .filter(report => report.money_collected > 0 && report.prize_value > 0)
          .map(report => (report.prize_value / report.money_collected) * 100);
        
        if (payoutPercentages.length > 0) {
          averagePayout = payoutPercentages.reduce((sum, payout) => sum + payout, 0) / payoutPercentages.length;
        }
      }

      const lastReport = reports && reports.length > 0 
        ? reports[0].report_date || reports[0].created_at 
        : null;

      const lastServiced = jobs && jobs.length > 0 
        ? jobs[0].created_at 
        : machine.last_serviced || null;

      setMachineStats({
        totalEarnings,
        totalReports: reports?.length || 0,
        lastReport,
        lastServiced,
        toysDispensed: totalToysDispensed,
        averagePayout,
        loading: false
      });

      console.log('✅ Machine stats calculated:', {
        totalEarnings,
        totalReports: reports?.length || 0,
        averagePayout: averagePayout?.toFixed(2) + '%'
      });

    } catch (error) {
      console.error('❌ Error fetching machine stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load machine statistics',
        variant: 'destructive'
      });
      setMachineStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleViewReports = () => {
    setShowReports(true);
  };

  const handleCreateReport = () => {
    setShowCreateReport(true);
  };

  const handleScheduleService = () => {
    setShowServiceDialog(true);
  };

  const handleEditDetails = () => {
    setShowEditDialog(true);
  };

  const handleAddPrizes = () => {
    setShowAddPrizes(true);
  };

  const handleServiceScheduled = () => {
    setShowServiceDialog(false);
    // Refresh stats to update last serviced
    fetchMachineStats();
  };

  // Use the shared image utility
  const machineImage = createImageWithFallback(machine.image_url, machine.name, 'machine');

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-700 text-white p-6 rounded-t-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">🎮 {machine.name}</h1>
                <p className="text-red-100 text-lg">{machine.type}</p>
                <div className="flex items-center gap-4 mt-2">
                  <Badge className={`${getStatusColor(machine.status)} text-sm`}>
                    {machine.status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                  {machine.serial_number && (
                    <span className="text-red-100 text-sm">
                      Serial: {machine.serial_number}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-red-700 p-2"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Image and Barcode */}
              <div className="space-y-6">
                {/* Machine Image */}
                {machine.image_url && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Machine Image</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-center">
                        <img
                          src={machineImage.src}
                          alt={machine.name}
                          className="max-w-full max-h-64 object-contain rounded-lg shadow-md"
                          onError={machineImage.onError}
                          crossOrigin="anonymous"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Barcode Display */}
                {machine.barcode && (
                  <MachineBarcodeDisplay
                    barcode={machine.barcode}
                    machineName={machine.name}
                  />
                )}

                {/* PayWave Terminals Information */}
                <PayWaveDisplay 
                  machineId={machine.id}
                  machineName={machine.name}
                  showInline={false}
                />
              </div>

              {/* Middle Column - Stats and Info */}
              <div className="space-y-6">
                {/* Location Info */}
                {machine.venue && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-red-600" />
                        Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-xl font-semibold">{machine.venue.name}</p>
                        {machine.venue.address && (
                          <p className="text-gray-600">{machine.venue.address}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Performance Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Performance Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {machineStats.loading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading stats...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            ${machineStats.totalEarnings.toFixed(2)}
                          </div>
                          <div className="text-sm text-green-700">Total Earnings</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {machineStats.totalReports}
                          </div>
                          <div className="text-sm text-blue-700">Total Reports</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {machineStats.toysDispensed}
                          </div>
                          <div className="text-sm text-purple-700">Toys Dispensed</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {machineStats.averagePayout ? `${machineStats.averagePayout.toFixed(1)}%` : 'N/A'}
                          </div>
                          <div className="text-sm text-orange-700">Avg Payout</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Service Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-blue-600" />
                      Service Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-600">Last Serviced:</span>
                        <div className="font-semibold">
                          {machineStats.lastServiced
                            ? new Date(machineStats.lastServiced).toLocaleDateString()
                            : 'Never recorded'
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Last Report:</span>
                        <div className="font-semibold">
                          {machineStats.lastReport
                            ? new Date(machineStats.lastReport).toLocaleDateString()
                            : 'No reports yet'
                          }
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Machine Details */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Machine Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-600">Machine ID:</span>
                        <div className="font-mono text-sm">{machine.id}</div>
                      </div>
                      {machine.serial_number && (
                        <div>
                          <span className="text-gray-600">Serial Number:</span>
                          <div className="font-mono">{machine.serial_number}</div>
                        </div>
                      )}
                      {machine.barcode && (
                        <div>
                          <span className="text-gray-600">Barcode:</span>
                          <div className="font-mono text-sm break-all">{machine.barcode}</div>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <div className="font-semibold">{machine.type}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleAddPrizes}
              >
                <Gift className="h-4 w-4 mr-2" />
                Add Prizes
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleCreateReport}
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Report
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleViewReports}
              >
                📊 View Reports
              </Button>
              <Button
                variant="outline"
                onClick={handleScheduleService}
              >
                🔧 Schedule Service
              </Button>
              <Button
                variant="outline"
                onClick={handleEditDetails}
              >
                📝 Edit Details
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddPrizesToMachine
        machineId={machine.id}
        machineName={machine.name}
        isOpen={showAddPrizes}
        onClose={() => setShowAddPrizes(false)}
      />

      <Dialog open={showCreateReport} onOpenChange={setShowCreateReport}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Report - {machine.name}</DialogTitle>
          </DialogHeader>
          <MachineReportForm />
        </DialogContent>
      </Dialog>

      <Dialog open={showReports} onOpenChange={setShowReports}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Machine Reports - {machine.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <ReportsContent />
          </div>
        </DialogContent>
      </Dialog>

      <MachineEditDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        machine={machine}
      />

      <ServiceScheduleDialog
        isOpen={showServiceDialog}
        onClose={() => setShowServiceDialog(false)}
        machineId={machine.id}
        machineName={machine.name}
        onServiceScheduled={handleServiceScheduled}
      />
    </>
  );
};

export default MachineProfile;