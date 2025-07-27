import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Scan, X } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { AutoBarcodeScanner } from './AutoBarcodeScanner';

interface MachineSelectInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

export const MachineSelectInput: React.FC<MachineSelectInputProps> = ({
  value,
  onChange,
  label = 'Select Machine',
  required = false
}) => {
  const { machines, findMachineByBarcode } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const filteredMachines = machines?.filter(machine => 
    machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const selectedMachine = machines?.find(m => m.id === value);

  // Auto-select machine when typing matches exactly one result
  useEffect(() => {
    if (searchTerm.trim() && filteredMachines.length === 1 && !selectedMachine) {
      const machine = filteredMachines[0];
      // Auto-select if search term closely matches serial number or name
      const exactMatch = machine.serial_number?.toLowerCase() === searchTerm.toLowerCase() ||
                        machine.name.toLowerCase() === searchTerm.toLowerCase() ||
                        machine.barcode?.toLowerCase() === searchTerm.toLowerCase();
      
      if (exactMatch) {
        onChange(machine.id);
        setSearchTerm('');
      }
    }
  }, [searchTerm, filteredMachines, selectedMachine, onChange]);

  const handleScanResult = async (barcode: string) => {
    setIsSearching(true);
    try {
      const machine = await findMachineByBarcode(barcode);
      if (machine) {
        onChange(machine.id);
        setSearchTerm('');
      }
    } catch (error) {
      console.error('Error finding machine:', error);
    } finally {
      setIsSearching(false);
      setIsScannerOpen(false);
    }
  };

  const clearSelection = () => {
    onChange('');
    setSearchTerm('');
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="font-semibold">
          {label} {required && '*'}
        </Label>
        
        {/* Search and Scanner Controls */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Type machine name or serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-8"
            />
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsScannerOpen(true)}
            disabled={isSearching}
            className="shrink-0"
          >
            <Scan className="h-4 w-4 mr-1" />
            {isSearching ? 'Scanning...' : 'Scan'}
          </Button>
        </div>

        {/* Auto-suggestions for partial matches */}
        {searchTerm && filteredMachines.length > 1 && !selectedMachine && (
          <div className="max-h-32 overflow-y-auto border rounded-md">
            {filteredMachines.slice(0, 5).map((machine) => (
              <button
                key={machine.id}
                type="button"
                className="w-full text-left p-2 hover:bg-gray-50 border-b last:border-b-0"
                onClick={() => {
                  onChange(machine.id);
                  setSearchTerm('');
                }}
              >
                <div className="font-medium">{machine.name}</div>
                <div className="text-sm text-gray-500">
                  {machine.type} • Serial: {machine.serial_number || 'N/A'}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected Machine Display */}
        {selectedMachine && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <p className="font-medium">{selectedMachine.name}</p>
              <p className="text-sm text-gray-600">
                {selectedMachine.type} • Serial: {selectedMachine.serial_number || 'N/A'}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Fallback dropdown for manual selection */}
        {!selectedMachine && !searchTerm && (
          <Select value={value} onValueChange={onChange} required={required}>
            <SelectTrigger>
              <SelectValue placeholder="Or choose from all machines..." />
            </SelectTrigger>
            <SelectContent>
              {machines?.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">
                  No machines available
                </div>
              ) : (
                machines?.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{machine.name}</span>
                      <span className="text-xs text-gray-500">
                        {machine.type} • Serial: {machine.serial_number || 'N/A'}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Barcode Scanner */}
      <AutoBarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanResult}
      />
    </>
  );
};

export default MachineSelectInput;