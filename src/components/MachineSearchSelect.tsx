import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Scan, AlertCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { MachineProfile } from './MachineProfile';
import { AutoBarcodeScanner } from './AutoBarcodeScanner';

export const MachineSearchSelect: React.FC = () => {
  const { machines, findMachineByBarcode } = useAppContext();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [foundMachine, setFoundMachine] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleStartAutoScan = () => {
    setIsScannerOpen(true);
    setError('');
    setScanResult('');
    setFoundMachine(null);
  };

  const handleScanResult = async (barcode: string) => {
    setIsSearching(true);
    setScanResult(barcode);
    
    try {
      console.log('🔍 Searching for machine with barcode:', barcode);
      const machine = await findMachineByBarcode(barcode);
      
      if (machine) {
        console.log('🎮 Machine found:', machine.name);
        setFoundMachine(machine);
        setShowProfile(true);
        setError('');
      } else {
        setError(`No machine found with barcode: ${barcode}`);
      }
    } catch (err: any) {
      console.error('❌ Search error:', err);
      setError(err.message || 'Failed to find machine');
    } finally {
      setIsSearching(false);
      setIsScannerOpen(false);
    }
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
    setFoundMachine(null);
    setScanResult('');
  };

  const handleMachineSelect = (machine: any) => {
    setFoundMachine(machine);
    setShowProfile(true);
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Machine Search & Select
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-Scan Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Auto Barcode Detection
            </h3>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleStartAutoScan}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
                disabled={isSearching}
              >
                {isSearching ? 'Searching...' : 'Start Camera Scan'}
              </Button>
              
              {scanResult && (
                <Badge variant="default" className="bg-green-500">
                  Last scan: {scanResult}
                </Badge>
              )}
            </div>
            
            {error && (
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-700">{error}</span>
              </div>
            )}
          </div>

          {/* Manual Selection */}
          <div className="space-y-3">
            <h3 className="font-semibold">Select Machine Manually</h3>
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {machines?.map((machine) => (
                <Button
                  key={machine.id}
                  variant="outline"
                  className="justify-start h-auto p-3 text-left"
                  onClick={() => handleMachineSelect(machine)}
                >
                  <div className="space-y-1">
                    <div className="font-medium">{machine.name}</div>
                    <div className="text-sm text-gray-500">
                      {machine.type} • {machine.barcode || 'No barcode'}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto Barcode Scanner */}
      <AutoBarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanResult}
      />

      {/* Full-screen Machine Profile */}
      {showProfile && foundMachine && (
        <MachineProfile 
          machine={foundMachine} 
          onClose={handleCloseProfile}
        />
      )}
    </>
  );
};

export default MachineSearchSelect;