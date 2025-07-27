import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, MapPin, Calendar, Wrench, DollarSign, FileText } from 'lucide-react';
import { MachineBarcodeDisplay } from './MachineBarcodeDisplay';
import { MachineEditDialog } from './MachineEditDialog';
import { ServiceScheduleDialog } from './ServiceScheduleDialog';
import { ReportsContent } from './ReportsContent';
import MachineReportForm from './MachineReportForm';

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

export const MachineProfile: React.FC<MachineProfileProps> = ({ machine, onClose }) => {
  const [showReports, setShowReports] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showCreateReport, setShowCreateReport] = useState(false);

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

  const handleServiceScheduled = () => {
    setShowServiceDialog(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-red-600 text-white p-6 rounded-t-lg">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">🎮 {machine.name}</h1>
                <p className="text-red-100 text-lg">{machine.type}</p>
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
            {/* Machine Image */}
            {machine.image_url && (
              <Card>
                <CardHeader>
                  <CardTitle>Machine Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <img 
                      src={machine.image_url} 
                      alt={machine.name}
                      className="max-w-full max-h-64 object-contain rounded-lg shadow-md"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
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

            {/* Status and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge 
                    variant={machine.status === 'active' ? 'default' : 'secondary'}
                    className="text-lg px-3 py-1"
                  >
                    {machine.status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Serial Number</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-lg">{machine.serial_number || 'N/A'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Barcode ID</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-sm break-all">{machine.barcode || 'N/A'}</p>
                </CardContent>
              </Card>
            </div>

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

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Total Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    ${machine.total_earnings?.toFixed(2) || '0.00'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-blue-600" />
                    Last Serviced
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg">
                    {machine.last_serviced 
                      ? new Date(machine.last_serviced).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
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

      {/* Create Report Dialog */}
      <Dialog open={showCreateReport} onOpenChange={setShowCreateReport}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Report - {machine.name}</DialogTitle>
          </DialogHeader>
          <MachineReportForm />
        </DialogContent>
      </Dialog>

      {/* Reports Dialog */}
      <Dialog open={showReports} onOpenChange={setShowReports}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Machine Reports - {machine.name}</DialogTitle>
          </DialogHeader>
          <ReportsContent />
        </DialogContent>
      </Dialog>

      {/* Edit Machine Dialog */}
      <MachineEditDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        machineId={machine.id}
        machineName={machine.name}
      />

      {/* Service Schedule Dialog */}
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