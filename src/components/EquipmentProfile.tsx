import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, MapPin, Calendar, Package, DollarSign, Edit, History, FileText, AlertTriangle } from 'lucide-react';
import { EquipmentEditDialog } from './EquipmentEditDialog';
import { createImageWithFallback } from '@/lib/imageUtils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

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
  venue?: {
    id: string;
    name: string;
    address?: string;
  };
}

interface EquipmentProfileProps {
  equipment: Equipment;
  onClose: () => void;
}

interface EquipmentHistory {
  id: string;
  action: string;
  from_venue?: { name: string };
  to_venue?: { name: string };
  action_date: string;
  notes?: string;
  performed_by?: string;
  created_at: string;
}

export const EquipmentProfile: React.FC<EquipmentProfileProps> = ({ equipment, onClose }) => {
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [equipmentHistory, setEquipmentHistory] = useState<EquipmentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEquipmentHistory();
  }, [equipment.id]);

  const fetchEquipmentHistory = async () => {
    try {
      setLoading(true);
      console.log('📚 Fetching history for equipment:', equipment.name);

      const { data, error } = await supabase
        .from('equipment_hire_history')
        .select(`
          *,
          from_venue:venues!from_venue_id(name),
          to_venue:venues!to_venue_id(name)
        `)
        .eq('equipment_id', equipment.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching equipment history:', error);
        throw error;
      }

      console.log('✅ Equipment history loaded:', data?.length || 0, 'records');
      setEquipmentHistory(data || []);

    } catch (error) {
      console.error('❌ Error fetching equipment history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load equipment history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditDetails = () => {
    setShowEditDialog(true);
  };

  // Use the shared image utility
  const equipmentImage = createImageWithFallback(equipment.image_url, equipment.name);

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

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'hired': return '📤';
      case 'returned': return '📥';
      case 'transferred': return '🔄';
      case 'maintenance': return '🔧';
      case 'created': return '✨';
      case 'retired': return '🏁';
      default: return '📝';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount?: number) => {
    return amount ? `$${amount.toFixed(2)}` : 'Not specified';
  };

  const isOverdue = () => {
    if (!equipment.expected_return_date || equipment.status !== 'hired') return false;
    return new Date(equipment.expected_return_date) < new Date();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 text-white p-6 rounded-t-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <span className="text-4xl">{getCategoryIcon(equipment.category)}</span>
                  {equipment.name}
                </h1>
                <p className="text-blue-100 text-lg">{equipment.category.replace('_', ' ').toUpperCase()}</p>
                <div className="flex items-center gap-4 mt-2">
                  <Badge className={`${getStatusColor(equipment.status)} text-sm`}>
                    {equipment.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge className={`${getConditionColor(equipment.condition)} text-sm`}>
                    {equipment.condition.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {equipment.serial_number && (
                    <span className="text-blue-100 text-sm">
                      Serial: {equipment.serial_number}
                    </span>
                  )}
                  {isOverdue() && (
                    <Badge className="bg-red-500 text-white text-sm">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      OVERDUE
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-blue-700 p-2"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Image and Basic Info */}
              <div className="space-y-6">
                {/* Equipment Image */}
                <Card>
                  <CardHeader>
                    <CardTitle>Equipment Image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center">
                      {equipment.image_url ? (
                        <img
                          src={equipmentImage.src}
                          alt={equipment.name}
                          className="max-w-full max-h-64 object-contain rounded-lg shadow-md"
                          onError={equipmentImage.onError}
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <span className="text-6xl">{getCategoryIcon(equipment.category)}</span>
                            <p className="text-gray-500 mt-2">No image available</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Quick Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-gray-600">Category:</span>
                      <div className="font-semibold">{equipment.category.replace('_', ' ')}</div>
                    </div>
                    {equipment.brand && (
                      <div>
                        <span className="text-gray-600">Brand:</span>
                        <div className="font-semibold">
                          {equipment.brand} {equipment.model && `(${equipment.model})`}
                        </div>
                      </div>
                    )}
                    {equipment.asset_tag && (
                      <div>
                        <span className="text-gray-600">Asset Tag:</span>
                        <div className="font-mono">{equipment.asset_tag}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Added:</span>
                      <div className="font-semibold">{formatDate(equipment.created_at)}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Middle Column - Location and Status */}
              <div className="space-y-6">
                {/* Current Location */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      Current Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-xl font-semibold">
                        {equipment.venue?.name || 'Not assigned to any venue'}
                      </p>
                      {equipment.venue?.address && (
                        <p className="text-gray-600">{equipment.venue.address}</p>
                      )}
                      {equipment.status === 'hired' && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-semibold text-blue-800 mb-2">Hire Details</h4>
                          {equipment.hired_date && (
                            <p className="text-sm text-blue-700">
                              <strong>Hired:</strong> {formatDate(equipment.hired_date)}
                            </p>
                          )}
                          {equipment.expected_return_date && (
                            <p className="text-sm text-blue-700">
                              <strong>Expected Return:</strong> {formatDate(equipment.expected_return_date)}
                            </p>
                          )}
                          {isOverdue() && (
                            <p className="text-sm text-red-700 font-semibold mt-2">
                              ⚠️ This equipment is overdue for return!
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Financial Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(equipment.purchase_cost)}
                        </div>
                        <div className="text-sm text-green-700">Purchase Cost</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(equipment.current_value)}
                        </div>
                        <div className="text-sm text-blue-700">Current Value</div>
                      </div>
                    </div>
                    {equipment.purchase_date && (
                      <div className="mt-3 text-sm text-gray-600">
                        <strong>Purchase Date:</strong> {formatDate(equipment.purchase_date)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Details and History */}
              <div className="space-y-6">
                {/* Equipment Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Equipment Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-600">Equipment ID:</span>
                        <div className="font-mono text-sm">{equipment.id}</div>
                      </div>
                      {equipment.serial_number && (
                        <div>
                          <span className="text-gray-600">Serial Number:</span>
                          <div className="font-mono">{equipment.serial_number}</div>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <div className="font-semibold">{equipment.status.replace('_', ' ')}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Condition:</span>
                        <div className="font-semibold">{equipment.condition.replace('_', ' ')}</div>
                      </div>
                      {equipment.description && (
                        <div>
                          <span className="text-gray-600">Description:</span>
                          <div className="text-sm mt-1">{equipment.description}</div>
                        </div>
                      )}
                      {equipment.notes && (
                        <div>
                          <span className="text-gray-600">Notes:</span>
                          <div className="text-sm mt-1 p-2 bg-gray-50 rounded">{equipment.notes}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Loading history...</span>
                      </div>
                    ) : equipmentHistory.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        No activity recorded for this equipment.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {equipmentHistory.slice(0, 5).map((record) => (
                          <div key={record.id} className="border rounded-lg p-3">
                            <div className="flex items-start gap-3">
                              <span className="text-lg">{getActionIcon(record.action)}</span>
                              <div className="flex-1">
                                <h4 className="font-medium capitalize">
                                  {record.action.replace('_', ' ')}
                                </h4>
                                <p className="text-sm text-gray-600">{record.notes}</p>
                                {record.from_venue && (
                                  <p className="text-xs text-gray-500">
                                    From: {record.from_venue.name}
                                  </p>
                                )}
                                {record.to_venue && (
                                  <p className="text-xs text-gray-500">
                                    To: {record.to_venue.name}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDateTime(record.created_at)}
                                  {record.performed_by && ` • by ${record.performed_by}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {equipmentHistory.length > 5 && (
                          <p className="text-sm text-gray-500 text-center">
                            + {equipmentHistory.length - 5} more records
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleEditDetails}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Details
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <EquipmentEditDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        equipment={equipment}
      />
    </>
  );
};

export default EquipmentProfile;