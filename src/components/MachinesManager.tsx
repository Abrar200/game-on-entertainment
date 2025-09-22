import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, QrCode, Edit, Trash2, Eye, Calendar, AlertTriangle } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import AutoBarcodeScanner from '@/components/AutoBarcodeScanner';
import MachineEditDialog from '@/components/MachineEditDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import MachineProfile from '@/components/MachineProfile';
import PayoutCalculator from '@/components/PayoutCalculator';
import PayWaveDisplay from '@/components/PayWaveDisplay';
import { useToast } from '@/hooks/use-toast';
import { createImageWithFallback } from '@/lib/imageUtils';
import { supabase } from '@/lib/supabase';

interface MachinesManagerProps {
  readOnly?: boolean;
}

interface MachineWithRotation {
  id: string;
  name: string;
  type: string;
  venue_id?: string | null;
  status: string;
  image_url?: string;
  earnings?: number;
  venue?: any;
  current_prize_id?: string | null;
  current_prize?: any;
  serial_number?: string;
  barcode?: string;
  paywave_terminals?: any[];
  rotation_period?: number; // 3, 6, or 12 months
  last_rotation_date?: string;
  rotation_threshold?: number; // earnings threshold in dollars
  needs_rotation?: boolean;
  weekly_earnings?: number;
  _justUpdated?: boolean;
}

const MachinesManager: React.FC<MachinesManagerProps> = ({ readOnly = false }) => {
  const { machines, venues, deleteMachine, findMachineByBarcode, refreshData } = useAppContext();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [machinesWithRotation, setMachinesWithRotation] = useState<MachineWithRotation[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Enhanced filtering to include venue name search
  const filteredMachines = machinesWithRotation.filter(machine => {
    const searchLower = searchTerm.toLowerCase();
    const machineName = machine.name.toLowerCase();
    const machineType = machine.type?.toLowerCase() || '';
    const machineSerial = machine.serial_number?.toLowerCase() || '';
    const machineBarcode = machine.barcode?.toLowerCase() || '';
    const venueName = machine.venue?.name?.toLowerCase() || '';
    
    return machineName.includes(searchLower) ||
           machineType.includes(searchLower) ||
           machineSerial.includes(searchLower) ||
           machineBarcode.includes(searchLower) ||
           venueName.includes(searchLower); // NEW: Search by venue name
  });

  // Load machines with rotation data
  useEffect(() => {
    loadMachinesWithRotationData();
  }, [machines]);

  const loadMachinesWithRotationData = async () => {
    try {
      console.log('🔄 Loading machines with rotation data...');
      
      const machinesWithRotationData = await Promise.all(
        machines.map(async (machine) => {
          try {
            // Fetch rotation settings from machine_rotations table
            const { data: rotationData } = await supabase
              .from('machine_rotations')
              .select('rotation_period, last_rotation_date, rotation_threshold')
              .eq('machine_id', machine.id)
              .single();

            // Calculate earnings and rotation status
            const earningsData = await calculateMachineEarnings(machine.id);
            
            const machineWithRotation: MachineWithRotation = {
              ...machine,
              rotation_period: rotationData?.rotation_period || null,
              last_rotation_date: rotationData?.last_rotation_date || null,
              rotation_threshold: rotationData?.rotation_threshold || 300, // Default $300
              weekly_earnings: earningsData.weeklyEarnings,
              needs_rotation: await checkIfNeedsRotation(machine.id, rotationData, earningsData)
            };

            return machineWithRotation;
          } catch (error) {
            console.warn(`Error loading rotation data for machine ${machine.id}:`, error);
            return { ...machine, rotation_period: null, needs_rotation: false };
          }
        })
      );

      setMachinesWithRotation(machinesWithRotationData);
      console.log('✅ Loaded machines with rotation data:', machinesWithRotationData.length);
    } catch (error) {
      console.error('❌ Error loading machines with rotation data:', error);
      // Fallback to regular machines without rotation data
      setMachinesWithRotation(machines.map(m => ({ ...m, needs_rotation: false })));
    }
  };

  // Calculate machine earnings from reports
  const calculateMachineEarnings = async (machineId: string) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const { data: reports } = await supabase
        .from('machine_reports')
        .select('money_collected, report_date, created_at')
        .eq('machine_id', machineId)
        .gte('report_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('report_date', { ascending: false });

      if (!reports || reports.length === 0) {
        return { totalEarnings: 0, weeklyEarnings: 0, reportsCount: 0 };
      }

      const totalEarnings = reports.reduce((sum, report) => sum + (report.money_collected || 0), 0);
      
      // Calculate weekly earnings (total earnings / 4.33 weeks per month)
      const weeklyEarnings = totalEarnings / 4.33;

      return {
        totalEarnings,
        weeklyEarnings,
        reportsCount: reports.length
      };
    } catch (error) {
      console.error('Error calculating machine earnings:', error);
      return { totalEarnings: 0, weeklyEarnings: 0, reportsCount: 0 };
    }
  };

  // Check if machine needs rotation based on period and earnings
  const checkIfNeedsRotation = async (machineId: string, rotationData: any, earningsData: any) => {
    if (!rotationData?.rotation_period) return false;

    const now = new Date();
    const lastRotation = rotationData.last_rotation_date ? new Date(rotationData.last_rotation_date) : null;
    const threshold = rotationData.rotation_threshold || 300;

    // Check earnings threshold - if below threshold, needs immediate rotation
    if (earningsData.totalEarnings < threshold) {
      console.log(`Machine ${machineId} below earnings threshold: $${earningsData.totalEarnings} < $${threshold}`);
      return true;
    }

    // Check rotation period
    if (lastRotation) {
      const monthsSinceRotation = (now.getTime() - lastRotation.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSinceRotation >= rotationData.rotation_period) {
        console.log(`Machine ${machineId} due for rotation: ${monthsSinceRotation} months >= ${rotationData.rotation_period} months`);
        return true;
      }
    } else {
      // No previous rotation recorded - check if machine is older than rotation period
      // For now, assume needs rotation if no last rotation date
      return true;
    }

    return false;
  };

  // Sync local state with context when machines change
  useEffect(() => {
    loadMachinesWithRotationData();
  }, [machines]);

  // Listen for machine updates from MachineEditDialog
  useEffect(() => {
    const handleMachineUpdate = (event: CustomEvent) => {
      console.log('📡 MachinesManager received machine update:', event.detail);
      const { machineId, updatedData } = event.detail;

      // Optimistically update the local machine data
      setMachinesWithRotation(prevMachines => 
        prevMachines.map(machine => 
          machine.id === machineId 
            ? { ...machine, ...updatedData }
            : machine
        )
      );

      // Also trigger a background refresh to ensure we have the latest data
      setTimeout(() => {
        refreshData();
      }, 500);
    };

    const handleMachineAdded = () => {
      console.log('📡 New machine added, refreshing data...');
      refreshData();
    };

    const handleMachineDeleted = (event: CustomEvent) => {
      console.log('📡 Machine deleted:', event.detail);
      const { machineId } = event.detail;
      
      // Optimistically remove the machine from local state
      setMachinesWithRotation(prevMachines => 
        prevMachines.filter(machine => machine.id !== machineId)
      );
    };

    // Listen for custom events
    window.addEventListener('machineUpdated', handleMachineUpdate as EventListener);
    window.addEventListener('machineAdded', handleMachineAdded);
    window.addEventListener('machineDeleted', handleMachineDeleted as EventListener);

    return () => {
      window.removeEventListener('machineUpdated', handleMachineUpdate as EventListener);
      window.removeEventListener('machineAdded', handleMachineAdded);
      window.removeEventListener('machineDeleted', handleMachineDeleted as EventListener);
    };
  }, [refreshData]);

  // Listen for PayWave terminal updates
  useEffect(() => {
    const handlePayWaveUpdate = (event: CustomEvent) => {
      console.log('📡 PayWave terminals updated:', event.detail);
      const { machineId, terminals } = event.detail;

      // Update the machine's PayWave terminals optimistically
      setMachinesWithRotation(prevMachines => 
        prevMachines.map(machine => 
          machine.id === machineId 
            ? { ...machine, paywave_terminals: terminals }
            : machine
        )
      );
    };

    window.addEventListener('paywaveUpdated', handlePayWaveUpdate as EventListener);
    
    return () => {
      window.removeEventListener('paywaveUpdated', handlePayWaveUpdate as EventListener);
    };
  }, []);

  const handleScanResult = async (barcode: string, machine?: any) => {
    try {
      console.log('🔍 MachinesManager handling scan result for barcode:', barcode);

      let foundMachine = machine;

      if (!foundMachine) {
        console.log('🔍 Looking up machine by barcode...');
        foundMachine = await findMachineByBarcode(barcode);
      }

      if (foundMachine) {
        console.log('✅ Machine found, opening profile:', foundMachine.name);
        setSelectedMachine(foundMachine);
        setShowProfile(true);
        toast({
          title: "Machine Found!",
          description: `Opening profile for ${foundMachine.name}`
        });
      }
    } catch (error: any) {
      console.error('❌ Error finding machine:', error);
      toast({
        title: "Machine Not Found",
        description: error.message || `No machine found with barcode: ${barcode}`,
        variant: "destructive"
      });
    }
  };

  const handleViewProfile = (machine: any) => {
    setSelectedMachine(machine);
    setShowProfile(true);
  };

  const handleEdit = (machine: any) => {
    setSelectedMachine(machine);
    setShowEditDialog(true);
  };

  const handleDelete = (machine: any) => {
    setSelectedMachine(machine);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (selectedMachine) {
      try {
        // Optimistic update - remove machine from local state immediately
        setMachinesWithRotation(prevMachines => 
          prevMachines.filter(machine => machine.id !== selectedMachine.id)
        );

        // Emit event for other components
        window.dispatchEvent(new CustomEvent('machineDeleted', { 
          detail: { machineId: selectedMachine.id } 
        }));

        // Background delete operation
        await deleteMachine(selectedMachine.id);
        
        toast({
          title: "Machine Deleted",
          description: `${selectedMachine.name} has been deleted`
        });
      } catch (error) {
        // Revert optimistic update on error
        setMachinesWithRotation(machines.map(m => ({ ...m, needs_rotation: false }))); // Reset to original state
        
        toast({
          title: "Error",
          description: "Failed to delete machine",
          variant: "destructive"
        });
      }
    }
    setShowDeleteDialog(false);
    setSelectedMachine(null);
  };

  const handleEditDialogClose = () => {
    setShowEditDialog(false);
    setSelectedMachine(null);
    
    // Trigger a refresh to ensure we have the latest data
    // This will happen after the optimistic updates
    setTimeout(() => {
      refreshData();
    }, 1000);
  };

  const getVenueName = (venueId: string) => {
    const venue = venues.find(v => v.id === venueId);
    return venue?.name || 'Unknown Venue';
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      await loadMachinesWithRotationData(); // Also refresh rotation data
      toast({
        title: "Refreshed",
        description: "Machine data has been updated"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Machines</h2>
          <p className="text-gray-600">
            {filteredMachines.length} machine{filteredMachines.length !== 1 ? 's' : ''} found
            {searchTerm && (
              <span className="text-blue-600 ml-2">
                (filtered by: "{searchTerm}")
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleManualRefresh}
            variant="outline"
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={() => setShowScanner(true)} variant="outline">
            <QrCode className="h-4 w-4 mr-2" />
            Scan Machine
          </Button>
          <Button onClick={() => {
            setSelectedMachine(null);
            setShowEditDialog(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Machine
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search machines by name, serial number, barcode, or venue name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            💡 <strong>Search tip:</strong> You can search by machine name, type, serial number, barcode, or venue name
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMachines.map((machine) => (
          <Card key={machine.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3 flex-1">
                  {/* NEW: Machine Image */}
                  {machine.image_url && (
                    <div className="flex-shrink-0">
                      <img
                        {...createImageWithFallback(machine.image_url, machine.name, 'machine')}
                        className="w-16 h-16 object-cover rounded border-2 border-gray-200"
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{machine.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant={machine.status === 'active' ? 'default' : 'secondary'}>
                        {machine.status}
                      </Badge>
                      {/* Show rotation status */}
                      {machine.needs_rotation && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Rotation Due
                        </Badge>
                      )}
                      {machine.rotation_period && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {machine.rotation_period}mo rotation
                        </Badge>
                      )}
                      {/* Show a small indicator if machine was recently updated */}
                      {machine._justUpdated && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Updated
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(machine)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(machine)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-gray-600">
                <p><strong>Venue:</strong> {getVenueName(machine.venue_id)}</p>
                {machine.serial_number && (
                  <p><strong>Serial:</strong> {machine.serial_number}</p>
                )}
                {machine.barcode && (
                  <p><strong>Barcode:</strong> {machine.barcode}</p>
                )}
                <p><strong>Type:</strong> {machine.type}</p>
                
                {/* NEW: Show earnings and rotation info */}
                {machine.weekly_earnings !== undefined && (
                  <p><strong>Weekly Earnings:</strong> ${machine.weekly_earnings.toFixed(2)}</p>
                )}
                {machine.rotation_threshold && (
                  <p><strong>Rotation Threshold:</strong> ${machine.rotation_threshold}/month</p>
                )}
                
                {/* PayWave display with real-time updates */}
                <div className="mt-2">
                  <PayWaveDisplay 
                    machineId={machine.id}
                    machineName={machine.name}
                    showInline={true}
                    className="relative"
                    key={`paywave-${machine.id}-${machine.paywave_terminals?.length || 0}`}
                  />
                </div>
              </div>

              <div className="border-t pt-2">
                <PayoutCalculator machineId={machine.id} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewProfile(machine)}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMachines.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchTerm ? `No machines match your search for "${searchTerm}"` : 'No machines found'}
          </p>
          {searchTerm && (
            <Button 
              variant="outline" 
              onClick={() => setSearchTerm('')}
              className="mt-2"
            >
              Clear Search
            </Button>
          )}
        </div>
      )}

      <AutoBarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanResult}
      />

      <MachineEditDialog
        isOpen={showEditDialog}
        onClose={handleEditDialogClose}
        machine={selectedMachine}
      />

      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedMachine(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Machine"
        description={`Are you sure you want to delete ${selectedMachine?.name}? This action cannot be undone.`}
      />

      {showProfile && selectedMachine && (
        <MachineProfile
          machine={selectedMachine}
          onClose={() => {
            setShowProfile(false);
            setSelectedMachine(null);
          }}
        />
      )}
    </div>
  );
};

export default MachinesManager;