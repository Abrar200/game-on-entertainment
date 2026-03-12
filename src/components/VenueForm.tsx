import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import ImageUpload from '@/components/ImageUpload';
import { loadGoogleMaps } from '@/lib/googleMaps';

const VenueForm: React.FC = () => {
  const { addVenue } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_person: '',
    phone: '',
    image_url: '',
    commission_percentage: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [loading, setLoading] = useState(false);

  // Google Maps autocomplete
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then(() => {
        if (mounted) setMapsReady(true);
      })
      .catch((err) => console.warn('Google Maps failed to load:', err));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!mapsReady || !addressInputRef.current) return;

    // Destroy any existing instance first
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
    }

    const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, {
      componentRestrictions: { country: 'au' },
      fields: ['formatted_address', 'geometry'],
      types: ['address'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        setFormData(prev => ({
          ...prev,
          address: place.formatted_address!,
          latitude: place.geometry?.location?.lat() ?? null,
          longitude: place.geometry?.location?.lng() ?? null,
        }));
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [mapsReady]);

  // Close the pac-container dropdown when user clicks away from the address field
  // This fixes the "stuck popup" bug where the dropdown blocks other fields
  const handleAddressBlur = () => {
    // Small delay so place_changed fires before we close
    setTimeout(() => {
      const pacContainers = document.querySelectorAll<HTMLElement>('.pac-container');
      pacContainers.forEach(el => {
        el.style.display = 'none';
      });
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      await addVenue({
        name: formData.name,
        address: formData.address,
        contact_person: formData.contact_person,
        phone: formData.phone,
        image_url: formData.image_url,
        commission_percentage: parseFloat(formData.commission_percentage) || 0,
        latitude: formData.latitude,
        longitude: formData.longitude,
      });
      setFormData({
        name: '',
        address: '',
        contact_person: '',
        phone: '',
        image_url: '',
        commission_percentage: '',
        latitude: null,
        longitude: null,
      });
    } catch (error) {
      console.error('Error adding venue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-purple-700">🏢 Add New Venue</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Venue Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter venue name"
              required
            />
          </div>

          {/* Address with Google Maps autocomplete */}
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              ref={addressInputRef}
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              onBlur={handleAddressBlur}
              placeholder={mapsReady ? 'Start typing an address…' : 'Enter address'}
              autoComplete="off"
            />
            {formData.latitude && formData.longitude && (
              <p className="text-xs text-green-600 mt-1">
                📍 Location saved ({formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)})
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="contact">Contact Person</Label>
            <Input
              id="contact"
              value={formData.contact_person}
              onChange={(e) => handleChange('contact_person', e.target.value)}
              placeholder="Enter contact person"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
          <div>
            <Label htmlFor="commission">Commission Percentage (%)</Label>
            <Input
              id="commission"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.commission_percentage}
              onChange={(e) => handleChange('commission_percentage', e.target.value)}
              placeholder="Enter commission percentage (e.g., 30)"
            />
          </div>
          <ImageUpload
            onImageUploaded={(url) => handleChange('image_url', url)}
            currentImage={formData.image_url}
            folder="venues"
          />
          <Button
            type="submit"
            disabled={loading || !formData.name.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {loading ? 'Adding...' : 'Add Venue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default VenueForm;