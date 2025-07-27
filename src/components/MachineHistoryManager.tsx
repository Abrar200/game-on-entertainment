import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, Search } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import MachineHistory from './MachineHistory';

const MachineHistoryManager: React.FC = () => {
  const { machines, selectedMachineForHistory, setSelectedMachineForHistory } = useAppContext();
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');

  const handleMachineSelect = (machineId: string) => {
    setSelectedMachineId(machineId);
    const machine = machines.find(m => m.id === machineId);
    setSelectedMachineForHistory(machine || null);
  };

  const handleViewHistory = () => {
    const machine = machines.find(m => m.id === selectedMachineId);
    if (machine) {
      setSelectedMachineForHistory(machine);
    }
  };

  const handleBackToSelection = () => {
    setSelectedMachineForHistory(null);
    setSelectedMachineId('');
  };

  if (selectedMachineForHistory) {
    return (
      <div className="space-y-6">
        <Button 
          onClick={handleBackToSelection}
          variant="outline"
          className="mb-4"
        >
          ← Back to Machine Selection
        </Button>
        <MachineHistory 
          machineId={selectedMachineForHistory.id} 
          machineName={selectedMachineForHistory.name} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-6 w-6" />
            Machine History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Select a machine to view its maintenance history and location tracking records.
            </p>
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a machine to view history" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.name} - {machine.venue?.name || 'No Venue'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleViewHistory}
                disabled={!selectedMachineId}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                View History
              </Button>
            </div>
            
            {machines.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No machines found. Add some machines first to track their history.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MachineHistoryManager;