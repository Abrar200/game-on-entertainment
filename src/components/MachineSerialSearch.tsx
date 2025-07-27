import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

interface MachineSerialSearchProps {
  onMachineSelect: (machineId: string) => void;
  selectedMachineId?: string;
  label?: string;
  required?: boolean;
}

export const MachineSerialSearch: React.FC<MachineSerialSearchProps> = ({
  onMachineSelect,
  selectedMachineId,
  label = 'Search by Serial Number',
  required = false
}) => {
  const { machines } = useAppContext();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Auto-search as user types
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, machines]);

  const performSearch = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    const searchLower = term.toLowerCase().trim();
    
    // Enhanced search - check multiple fields
    const results = machines?.filter(machine => {
      const serialMatch = machine.serial_number?.toLowerCase().includes(searchLower);
      const nameMatch = machine.name?.toLowerCase().includes(searchLower);
      const barcodeMatch = machine.barcode?.toLowerCase().includes(searchLower);
      const idMatch = machine.id?.toLowerCase().includes(searchLower);
      
      return serialMatch || nameMatch || barcodeMatch || idMatch;
    }) || [];
    
    // Sort results by relevance - exact serial number matches first
    results.sort((a, b) => {
      const aSerialExact = a.serial_number?.toLowerCase() === searchLower;
      const bSerialExact = b.serial_number?.toLowerCase() === searchLower;
      
      if (aSerialExact && !bSerialExact) return -1;
      if (!aSerialExact && bSerialExact) return 1;
      
      const aSerialStart = a.serial_number?.toLowerCase().startsWith(searchLower);
      const bSerialStart = b.serial_number?.toLowerCase().startsWith(searchLower);
      
      if (aSerialStart && !bSerialStart) return -1;
      if (!aSerialStart && bSerialStart) return 1;
      
      return 0;
    });
    
    setSearchResults(results);
    setShowResults(true);
    setIsSearching(false);

    // Auto-select if only one exact match
    if (results.length === 1 && results[0].serial_number?.toLowerCase() === searchLower) {
      handleSelectMachine(results[0]);
    }
  };

  const handleSearch = () => {
    performSearch(searchTerm);
    
    if (searchResults.length === 0 && searchTerm.trim()) {
      toast({
        title: 'No Results',
        description: `No machines found matching "${searchTerm}"`,
        variant: 'destructive'
      });
    }
  };

  const handleSelectMachine = (machine: any) => {
    onMachineSelect(machine.id);
    setSearchTerm(machine.serial_number || machine.name || '');
    setSearchResults([]);
    setShowResults(false);
    
    toast({
      title: 'Machine Selected',
      description: `Selected: ${machine.name} (${machine.serial_number || 'No Serial'})`,
    });
  };

  const selectedMachine = machines?.find(m => m.id === selectedMachineId);

  return (
    <div className="space-y-2">
      <Label>{label} {required && '*'}</Label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            placeholder="Enter serial number, name, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
          
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((machine) => (
                <button
                  key={machine.id}
                  type="button"
                  className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 focus:bg-blue-50 focus:outline-none"
                  onClick={() => handleSelectMachine(machine)}
                >
                  <div className="font-medium text-gray-900">{machine.name}</div>
                  <div className="text-sm text-gray-600">
                    Serial: {machine.serial_number || 'Not set'} • {machine.type}
                    {machine.venue?.name && ` • ${machine.venue.name}`}
                  </div>
                  {machine.barcode && (
                    <div className="text-xs text-gray-500">Barcode: {machine.barcode}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSearch}
          disabled={isSearching}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      
      {selectedMachine && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="font-medium text-green-800">✓ Selected Machine</div>
          <div className="text-sm text-green-700">
            {selectedMachine.name} ({selectedMachine.serial_number || 'No Serial'})
            {selectedMachine.venue?.name && ` @ ${selectedMachine.venue.name}`}
          </div>
        </div>
      )}
      
      {searchTerm && searchResults.length === 0 && !isSearching && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="text-sm text-yellow-800">
            No machines found matching "{searchTerm}". Try searching by:
            <ul className="mt-1 ml-4 list-disc text-xs">
              <li>Serial number</li>
              <li>Machine name</li>
              <li>Barcode</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineSerialSearch;