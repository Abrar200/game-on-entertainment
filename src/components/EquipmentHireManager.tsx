import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Eye, Package, MapPin, Calendar, AlertTriangle } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { EquipmentEditDialog } from '@/components/EquipmentEditDialog';
import EquipmentProfile from '@/components/EquipmentProfile';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { useToast } from '@/hooks/use-toast';
import { createImageWithFallback } from '@/lib/imageUtils';
import { supabase } from '@/lib/supabase';

interface Equipment {
  id: string;
  name: string;
  description?: string;
  category: string;
  serial_number?: string;
  asset_tag?: string;
  brand?: string;
  model?: string;
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  condition: string;
  status: string;
  venue_id?: string;
  hired_date?: string;
  expected_return_date?: string;
  notes?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  venue?: {
    id: string;
    name: string;
    address?: string;
  };
}

const EquipmentHireManager: React.FC = () => {
  const { venues, refreshData } = useAppContext();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Enhanced filtering
  const filteredEquipment = equipment.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const itemName = item.name.toLowerCase();
    const itemCategory = item.category?.toLowerCase() || '';
    const itemSerial = item.serial_number?.toLowerCase() || '';
    const itemBrand = item.brand?.toLowerCase() || '';
    const itemModel = item.model?.toLowerCase() || '';
    const venueName = item.venue?.name?.toLowerCase() || '';
    
    return itemName.includes(searchLower) ||
           itemCategory.includes(searchLower) ||
           itemSerial.includes(searchLower) ||
           itemBrand.includes(searchLower) ||
           itemModel.includes(searchLower) ||
           venueName.includes(searchLower);
  });

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      console.log('🚚 Fetching equipment hire data...');

      const { data, error } = await supabase
        .from('equipment_hire')
        .select(`
          *,
          venue:venues(
            id,
            name,
            address
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching equipment:', error);
        throw error;
      }

      console.log('✅ Equipment fetched:', data?.length || 0);
      setEquipment(data || []);

    } catch (error) {
      console.error('❌ Error fetching equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to load equipment data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowProfile(true);
  };

  const handleEdit = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowEditDialog(true);
  };

  const handleDelete = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedEquipment) return;

    try {
      console.log('🗑️ Deleting equipment:', selectedEquipment.name);

      const { error } = await supabase
        .from('equipment_hire')
        .delete()
        .eq('id', selectedEquipment.id);

      if (error) throw error;

      toast({
        title: 'Equipment Deleted',
        description: `${selectedEquipment.name} has been deleted`
      });

      await fetchEquipment();

    } catch (error) {
      console.error('❌ Error deleting equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete equipment',
        variant: 'destructive'
      });
    }

    setShowDeleteDialog(false);
    setSelectedEquipment(null);
  };

  const handleEditDialogClose = () => {
    setShowEditDialog(false);
    setSelectedEquipment(null);
    fetchEquipment(); // Refresh data
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchEquipment();
      toast({
        title: 'Refreshed',
        description: 'Equipment data has been updated'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh data',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'hired': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      case 'retired': return 'bg-gray-100 text-gray-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-orange-100 text-orange-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      case 'needs_repair': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'trolleys': return '🚐';
      case 'electronics': return '📱';
      case 'computers': return '💻';
      case 'keys': return '🔑';
      case 'access_control': return '🎫';
      case 'tools': return '🔧';
      case 'furniture': return '🪑';
      default: return '📦';
    }
  };

  const formatCurrency = (amount?: number) => {
    return amount ? `$${amount.toFixed(2)}` : 'N/A';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getVenueName = (equipment: Equipment) => {
    return equipment.venue?.name || 'Not assigned';
  };

  // Calculate statistics
  const totalEquipment = equipment.length;
  const hiredEquipment = equipment.filter(e => e.status === 'hired').length;
  const availableEquipment = equipment.filter(e => e.status === 'available').length;
  const maintenanceEquipment = equipment.filter(e => e.status === 'maintenance').length;
  const totalValue = equipment.reduce((sum, e) => sum + (e.current_value || e.purchase_cost || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading equipment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">🚚 Equipment Hire</h2>
          <p className="text-gray-600">
            {filteredEquipment.length} item{filteredEquipment.length !== 1 ? 's' : ''} found
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
          <Button onClick={() => {
            setSelectedEquipment(null);
            setShowEditDialog(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalEquipment}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{availableEquipment}</div>
                <div className="text-sm text-gray-600">Available</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{hiredEquipment}</div>
                <div className="text-sm text-gray-600">On Hire</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{maintenanceEquipment}</div>
                <div className="text-sm text-gray-600">Maintenance</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-lg">💰</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">${totalValue.toFixed(0)}</div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search equipment by name, category, serial number, brand, or venue..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            💡 <strong>Search tip:</strong> You can search by name, category, serial number, brand, model, or venue name
          </div>
        )}
      </div>

      {/* Equipment Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEquipment.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3 flex-1">
                  {/* Equipment Image */}
                  {item.image_url ? (
                    <div className="flex-shrink-0">
                      <img
                        {...createImageWithFallback(item.image_url, item.name)}
                        className="w-16 h-16 object-cover rounded border-2 border-gray-200"
                        crossOrigin="anonymous"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded border-2 border-gray-200 flex items-center justify-center text-2xl">
                      {getCategoryIcon(item.category)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{item.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className={getStatusColor(item.status)}>
                        {item.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={getConditionColor(item.condition)} variant="outline">
                        {item.condition.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-gray-600">
                <p><strong>Category:</strong> {item.category.replace('_', ' ')}</p>
                {item.brand && (
                  <p><strong>Brand:</strong> {item.brand} {item.model && `(${item.model})`}</p>
                )}
                {item.serial_number && (
                  <p><strong>Serial:</strong> {item.serial_number}</p>
                )}
                {item.asset_tag && (
                  <p><strong>Asset Tag:</strong> {item.asset_tag}</p>
                )}
                <p><strong>Location:</strong> {getVenueName(item)}</p>
                
                {item.status === 'hired' && item.hired_date && (
                  <p><strong>Hired:</strong> {formatDate(item.hired_date)}</p>
                )}
                
                {item.expected_return_date && (
                  <p><strong>Expected Return:</strong> {formatDate(item.expected_return_date)}</p>
                )}
                
                {(item.current_value || item.purchase_cost) && (
                  <p><strong>Value:</strong> {formatCurrency(item.current_value || item.purchase_cost)}</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewProfile(item)}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEquipment.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchTerm ? `No equipment matches your search for "${searchTerm}"` : 'No equipment found'}
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

      {/* Dialogs */}
      <EquipmentEditDialog
        isOpen={showEditDialog}
        onClose={handleEditDialogClose}
        equipment={selectedEquipment}
      />

      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedEquipment(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Equipment"
        description={`Are you sure you want to delete ${selectedEquipment?.name}? This action cannot be undone and will also delete all associated history.`}
      />

      {showProfile && selectedEquipment && (
        <EquipmentProfile
          equipment={selectedEquipment}
          onClose={() => {
            setShowProfile(false);
            setSelectedEquipment(null);
          }}
        />
      )}
    </div>
  );
};

export default EquipmentHireManager;