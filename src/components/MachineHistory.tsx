import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Wrench, MapPin } from 'lucide-react';
import MaintenanceHistory from './MaintenanceHistory';
import LocationHistory from './LocationHistory';

interface MachineHistoryProps {
  machineId: string;
  machineName: string;
}

const MachineHistory: React.FC<MachineHistoryProps> = ({ machineId, machineName }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-6 w-6" />
            Machine History - {machineName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="maintenance" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="maintenance" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Maintenance History
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="maintenance" className="mt-6">
              <MaintenanceHistory machineId={machineId} machineName={machineName} />
            </TabsContent>
            
            <TabsContent value="location" className="mt-6">
              <LocationHistory machineId={machineId} machineName={machineName} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MachineHistory;