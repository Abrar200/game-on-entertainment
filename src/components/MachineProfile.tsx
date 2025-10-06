import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  X, MapPin, Calendar, DollarSign, FileText, Gift, TrendingUp, Loader2, 
  History, Wrench, Save, X as XIcon, Info, AlertTriangle, Package 
} from 'lucide-react';
import { MachineBarcodeDisplay } from './MachineBarcodeDisplay';
import { MachineEditDialog } from './MachineEditDialog';
import { ServiceScheduleDialog } from './ServiceScheduleDialog';
import { ReportsContent } from './ReportsContent';
import MachineReportForm from './MachineReportForm';
import AddPrizesToMachine from './AddPrizesToMachine';
import PayWaveDisplay from './PayWaveDisplay';
import MachineMaintenanceHistory from './MachineMaintenanceHistory';
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
  userProfile?: any;
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

export const MachineProfile: React.FC<MachineProfileProps> = ({ machine, onClose, userProfile }) => {
  const { toast } = useToast();
  const [showReports, setShowReports] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [showAddPrizes, setShowAddPrizes] = useState(false);
  const [showMaintenanceHistory, setShowMaintenanceHistory] = useState(false);
  const [serviceInfo, setServiceInfo] = useState<any>(null);
  const [isEditingServiceInfo, setIsEditingServiceInfo] = useState(false);
  const [serviceInfoForm, setServiceInfoForm] = useState({
    service_instructions: '',
    maintenance_schedule: '',
    common_issues: '',
    parts_needed: '',
    safety_notes: ''
  });
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
    fetchServiceInfo();
  }, [machine.id]);

  const canEditServiceInfo = () => {
    return userProfile && ['super_admin', 'admin', 'manager'].includes(userProfile.role);
  };

  const fetchServiceInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('machine_service_info')
        .select('*')
        .eq('machine_id', machine.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching service info:', error);
        return;
      }

      if (data) {
        setServiceInfo(data);
        setServiceInfoForm({
          service_instructions: data.service_instructions || '',
          maintenance_schedule: data.maintenance_schedule || '',
          common_issues: data.common_issues || '',
          parts_needed: data.parts_needed || '',
          safety_notes: data.safety_notes || ''
        });
      }
    } catch (error) {
      console.error('Error fetching service info:', error);
    }
  };

  const handleSaveServiceInfo = async () => {
    try {
      const serviceData = {
        machine_id: machine.id,
        ...serviceInfoForm,
        updated_at: new Date().toISOString()
      };

      if (serviceInfo?.id) {
        // Update existing
        const { error } = await supabase
          .from('machine_service_info')
          .update(serviceData)
          .eq('id', serviceInfo.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('machine_service_info')
          .insert([serviceData]);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Service information saved successfully'
      });

      setIsEditingServiceInfo(false);
      await fetchServiceInfo();
    } catch (error) {
      console.error('Error saving service info:', error);
      toast({
        title: 'Error',
        description: 'Failed to save service information',
        variant: 'destructive'
      });
    }
  };

  const fetchMachineStats = async () => {
    try {
      setMachineStats(prev => ({ ...prev, loading: true }));
      console.log('Fetching stats for machine:', machine.name);

      // Fetch machine reports
      const { data: reports, error: reportsError } = await supabase
        .from('machine_reports')
        .select('money_collected, toys_dispensed, prize_value, report_date, created_at')
        .eq('machine_id', machine.id)
        .order('created_at', { ascending: false });

      if (reportsError) {
        console.error('Error fetching reports:', reportsError);
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
        console.warn('Error fetching jobs (may not exist):', jobsError);
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

      console.log('Machine stats calculated:', {
        totalEarnings,
        totalReports: reports?.length || 0,
        averagePayout: averagePayout?.toFixed(2) + '%'
      });

    } catch (error) {
      console.error('Error fetching machine stats:', error);
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

  const handleViewMaintenanceHistory = () => {
    setShowMaintenanceHistory(true);
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
                <h1 className="text-3xl font-bold mb-2">{machine.name}</h1>
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

            {/* Service Information Section - NEW */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-purple-600" />
                    Service Information
                  </CardTitle>
                  {canEditServiceInfo() && !isEditingServiceInfo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingServiceInfo(true)}
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {isEditingServiceInfo && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingServiceInfo(false);
                          setServiceInfoForm({
                            service_instructions: serviceInfo?.service_instructions || '',
                            maintenance_schedule: serviceInfo?.maintenance_schedule || '',
                            common_issues: serviceInfo?.common_issues || '',
                            parts_needed: serviceInfo?.parts_needed || '',
                            safety_notes: serviceInfo?.safety_notes || ''
                          });
                        }}
                      >
                        <XIcon className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveServiceInfo}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!canEditServiceInfo() && !serviceInfo && (
                  <p className="text-gray-500 text-sm italic">
                    No service information available for this machine
                  </p>
                )}

                {isEditingServiceInfo ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="service_instructions">Service Instructions</Label>
                      <Textarea
                        id="service_instructions"
                        value={serviceInfoForm.service_instructions}
                        onChange={(e) => setServiceInfoForm({
                          ...serviceInfoForm,
                          service_instructions: e.target.value
                        })}
                        placeholder="Step-by-step service instructions..."
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label htmlFor="maintenance_schedule">Maintenance Schedule</Label>
                      <Textarea
                        id="maintenance_schedule"
                        value={serviceInfoForm.maintenance_schedule}
                        onChange={(e) => setServiceInfoForm({
                          ...serviceInfoForm,
                          maintenance_schedule: e.target.value
                        })}
                        placeholder="Regular maintenance tasks and schedule..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="common_issues">Common Issues</Label>
                      <Textarea
                        id="common_issues"
                        value={serviceInfoForm.common_issues}
                        onChange={(e) => setServiceInfoForm({
                          ...serviceInfoForm,
                          common_issues: e.target.value
                        })}
                        placeholder="Common problems and troubleshooting..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="parts_needed">Parts Needed</Label>
                      <Textarea
                        id="parts_needed"
                        value={serviceInfoForm.parts_needed}
                        onChange={(e) => setServiceInfoForm({
                          ...serviceInfoForm,
                          parts_needed: e.target.value
                        })}
                        placeholder="Parts typically needed for service..."
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="safety_notes">Safety Notes</Label>
                      <Textarea
                        id="safety_notes"
                        value={serviceInfoForm.safety_notes}
                        onChange={(e) => setServiceInfoForm({
                          ...serviceInfoForm,
                          safety_notes: e.target.value
                        })}
                        placeholder="Important safety information..."
                        rows={2}
                        className="border-red-300 focus:border-red-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {serviceInfo?.service_instructions && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-blue-600" />
                          Service Instructions
                        </h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {serviceInfo.service_instructions}
                        </p>
                      </div>
                    )}

                    {serviceInfo?.maintenance_schedule && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-600" />
                          Maintenance Schedule
                        </h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {serviceInfo.maintenance_schedule}
                        </p>
                      </div>
                    )}

                    {serviceInfo?.common_issues && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          Common Issues
                        </h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {serviceInfo.common_issues}
                        </p>
                      </div>
                    )}

                    {serviceInfo?.parts_needed && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <Package className="h-4 w-4 text-purple-600" />
                          Parts Needed
                        </h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {serviceInfo.parts_needed}
                        </p>
                      </div>
                    )}

                    {serviceInfo?.safety_notes && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-red-800">
                          <AlertTriangle className="h-4 w-4" />
                          Safety Notes
                        </h4>
                        <p className="text-sm text-red-700 whitespace-pre-wrap">
                          {serviceInfo.safety_notes}
                        </p>
                      </div>
                    )}

                    {!serviceInfo?.service_instructions && 
                     !serviceInfo?.maintenance_schedule && 
                     !serviceInfo?.common_issues && 
                     !serviceInfo?.parts_needed && 
                     !serviceInfo?.safety_notes && (
                      <p className="text-gray-500 text-sm italic">
                        No service information available for this machine
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pt-4 border-t">
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
                View Reports
              </Button>
              <Button
                variant="outline"
                onClick={handleScheduleService}
              >
                Schedule Service
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleViewMaintenanceHistory}
              >
                <History className="h-4 w-4 mr-2" />
                Maintenance History
              </Button>
              <Button
                variant="outline"
                onClick={handleEditDetails}
              >
                Edit Details
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

      <Dialog open={showMaintenanceHistory} onOpenChange={setShowMaintenanceHistory}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Maintenance History - {machine.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <MachineMaintenanceHistory machineId={machine.id} machineName={machine.name} />
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