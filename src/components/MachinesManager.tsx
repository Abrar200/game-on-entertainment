import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, QrCode, Edit, Trash2, Eye } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import AutoBarcodeScanner from './AutoBarcodeScanner';
import MachineEditDialog from './MachineEditDialog';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import MachineProfile from './MachineProfile';
import PayoutCalculator from './PayoutCalculator';
import PayWaveDisplay from './PayWaveDisplay';
import { useToast } from '@/hooks/use-toast';

interface MachinesManagerProps {
  readOnly?: boolean;
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
  
  // Local state for optimistic updates
  const [localMachines, setLocalMachines] = useState(machines);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync local state with context when machines change
  useEffect(() => {
    setLocalMachines(machines);
  }, [machines]);

  // Listen for machine updates from MachineEditDialog
  useEffect(() => {
    const handleMachineUpdate = (event: CustomEvent) => {
      console.log('📡 MachinesManager received machine update:', event.detail);
      const { machineId, updatedData } = event.detail;

      // Optimistically update the local machine data
      setLocalMachines(prevMachines => 
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
      setLocalMachines(prevMachines => 
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
      setLocalMachines(prevMachines => 
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

  const filteredMachines = localMachines.filter(machine =>
    machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        setLocalMachines(prevMachines => 
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
        setLocalMachines(machines); // Reset to original state
        
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
          placeholder="Search machines by name, serial number, or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMachines.map((machine) => (
          <Card key={machine.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{machine.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={machine.status === 'active' ? 'default' : 'secondary'}>
                    {machine.status}
                  </Badge>
                  {/* Show a small indicator if machine was recently updated */}
                  {machine._justUpdated && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Updated
                    </Badge>
                  )}
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
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMachines.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchTerm ? 'No machines match your search' : 'No machines found'}
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