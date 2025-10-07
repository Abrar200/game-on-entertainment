import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { loadGoogleMaps } from '@/lib/googleMaps';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, placeDetails?: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Enter address',
  id,
  className
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use centralized loader
        await loadGoogleMaps();

        if (inputRef.current) {
          const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: 'au' }, // Restrict to Australia
            fields: ['address_components', 'formatted_address', 'geometry', 'name'],
            types: ['address']
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            
            if (place.formatted_address) {
              onChange(place.formatted_address, place);
            }
          });

          autocompleteRef.current = autocomplete;
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading Google Maps autocomplete:', err);
        setError('Failed to load address autocomplete');
        setIsLoading(false);
      }
    };

    initAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isLoading ? 'Loading autocomplete...' : placeholder}
        disabled={isLoading}
        className={className}
      />
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export default AddressAutocomplete;