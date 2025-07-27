import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { Trash2 } from 'lucide-react';
import VenueForm from './VenueForm';
import ImageUpload from './ImageUpload';
import Dashboard from './Dashboard';
import StockMovement from './StockMovement';
import PayoutAnalytics from './PayoutAnalytics';

const getImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `https://vdnvpolivbxtdtyaldan.supabase.co/storage/v1/object/public/images/${url}`;
};

const InventoryManager: React.FC = () => {
  const { venues = [], machines = [], prizes = [], addMachine, deleteMachine, addPrize, deletePrize, deleteVenue } = useAppContext();
  const [machineForm, setMachineForm] = useState({ name: '', type: '', venue_id: '', image_url: '' });
  const [prizeForm, setPrizeForm] = useState({ name: '', cost: '', stock_quantity: '', image_url: '' });

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineForm.name || !machineForm.type) return;
    
    try {
      await addMachine({ 
        name: machineForm.name, 
        type: machineForm.type, 
        venue_id: machineForm.venue_id || null,
        status: 'active',
        image_url: machineForm.image_url
      });
      setMachineForm({ name: '', type: '', venue_id: '', image_url: '' });
    } catch (error) {
      console.error('Error adding machine:', error);
    }
  };

  const handleAddPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prizeForm.name || !prizeForm.cost) return;
    
    try {
      await addPrize({ 
        name: prizeForm.name, 
        cost: parseFloat(prizeForm.cost), 
        stock_quantity: parseInt(prizeForm.stock_quantity) || 0,
        image_url: prizeForm.image_url
      });
      setPrizeForm({ name: '', cost: '', stock_quantity: '', image_url: '' });
    } catch (error) {
      console.error('Error adding prize:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">🎮 Arcade Inventory Manager</h1>
      
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
          <TabsTrigger value="venues">🏢 Venues</TabsTrigger>
          <TabsTrigger value="machines">🎰 Machines</TabsTrigger>
          <TabsTrigger value="prizes">🎁 Prizes</TabsTrigger>
          <TabsTrigger value="stock">📦 Stock</TabsTrigger>
          <TabsTrigger value="payouts">📈 Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Dashboard />
        </TabsContent>

        <TabsContent value="venues" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VenueForm />
            <Card>
              <CardHeader><CardTitle>📍 Current Venues</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {venues.map(venue => (
                  <div key={venue.id} className="flex justify-between items-center p-2 border rounded">
                    <div className="flex items-center space-x-3">
                      {venue.image_url && <img src={getImageUrl(venue.image_url)} alt={venue.name} className="w-12 h-12 object-cover rounded" />}
                      <div><strong>{venue.name}</strong><br/><small>{venue.address}</small></div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => deleteVenue(venue.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="machines" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>➕ Add Machine</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddMachine} className="space-y-4">
                  <div><Label>Name</Label><Input value={machineForm.name} onChange={(e) => setMachineForm({...machineForm, name: e.target.value})} required /></div>
                  <div><Label>Type</Label><Input value={machineForm.type} onChange={(e) => setMachineForm({...machineForm, type: e.target.value})} required /></div>
                  <div><Label>Venue</Label>
                    <Select value={machineForm.venue_id} onValueChange={(value) => setMachineForm({...machineForm, venue_id: value})}>
                      <SelectTrigger><SelectValue placeholder="Select venue (optional)" /></SelectTrigger>
                      <SelectContent>{venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <ImageUpload
                    onImageUploaded={(url) => setMachineForm({...machineForm, image_url: url})}
                    currentImage={machineForm.image_url}
                    folder="machines"
                  />
                  <Button type="submit" className="w-full">Add Machine</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>🎰 Current Machines</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {machines.map(machine => (
                  <div key={machine.id} className="flex justify-between items-center p-2 border rounded">
                    <div className="flex items-center space-x-3">
                      {machine.image_url && <img src={getImageUrl(machine.image_url)} alt={machine.name} className="w-12 h-12 object-cover rounded" />}
                      <div><strong>{machine.name}</strong><br/><small>{machine.type} - {machine.venue?.name || 'No venue'}</small></div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => deleteMachine(machine.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prizes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>➕ Add Prize</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddPrize} className="space-y-4">
                  <div><Label>Name</Label><Input value={prizeForm.name} onChange={(e) => setPrizeForm({...prizeForm, name: e.target.value})} required /></div>
                  <div><Label>Cost ($)</Label><Input type="number" step="0.01" value={prizeForm.cost} onChange={(e) => setPrizeForm({...prizeForm, cost: e.target.value})} required /></div>
                  <div><Label>Stock Quantity</Label><Input type="number" value={prizeForm.stock_quantity} onChange={(e) => setPrizeForm({...prizeForm, stock_quantity: e.target.value})} /></div>
                  <ImageUpload
                    onImageUploaded={(url) => setPrizeForm({...prizeForm, image_url: url})}
                    currentImage={prizeForm.image_url}
                    folder="prizes"
                  />
                  <Button type="submit" className="w-full">Add Prize</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>🎁 Current Prizes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {prizes.map(prize => (
                  <div key={prize.id} className="flex justify-between items-center p-2 border rounded">
                    <div className="flex items-center space-x-3">
                      {prize.image_url && <img src={getImageUrl(prize.image_url)} alt={prize.name} className="w-12 h-12 object-cover rounded" />}
                      <div><strong>{prize.name}</strong><br/><small>${prize.cost} - Stock: {prize.stock_quantity}</small></div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => deletePrize(prize.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="stock" className="space-y-4">
          <StockMovement />
        </TabsContent>
        
        <TabsContent value="payouts" className="space-y-4">
          <PayoutAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryManager;