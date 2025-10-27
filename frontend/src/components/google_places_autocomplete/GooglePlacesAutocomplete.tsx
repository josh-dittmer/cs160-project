"use client";

import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { useState, useRef } from 'react';

const libraries: ("places")[] = ["places"];

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: {
    address: string;
    city: string;
    state: string;
    zipcode: string;
  }) => void;
  placeholder?: string;
  className?: string;
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = "Enter address",
  className = "",
}: GooglePlacesAutocompleteProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
    
    // Restrict to San Jose, CA area
    const sanJoseCenter = new google.maps.LatLng(37.3382, -121.8863);
    const circle = new google.maps.Circle({
      center: sanJoseCenter,
      radius: 20000, // 20km radius around San Jose
    });
    
    autocompleteInstance.setBounds(circle.getBounds()!);
    autocompleteInstance.setOptions({
      strictBounds: true, // Only show results within bounds
      componentRestrictions: { country: 'us' },
      types: ['address'],
    });
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      
      if (!place.address_components) {
        return;
      }

      let streetNumber = '';
      let route = '';
      let city = '';
      let state = '';
      let zipcode = '';

      // Extract address components
      place.address_components.forEach((component) => {
        const types = component.types;
        
        if (types.includes('street_number')) {
          streetNumber = component.long_name;
        }
        if (types.includes('route')) {
          route = component.long_name;
        }
        if (types.includes('locality')) {
          city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
        if (types.includes('postal_code')) {
          zipcode = component.long_name;
        }
      });

      const fullAddress = `${streetNumber} ${route}`.trim();

      // Validate address has a house/building number
      if (!streetNumber || streetNumber.trim() === '') {
        alert('Please select a complete address with a house or building number (e.g., "123 Main St" not just "Main St")');
        // Call onPlaceSelected FIRST to set the flag, then clear the input
        onPlaceSelected({
          address: '',
          city: '',
          state: '',
          zipcode: '',
        });
        onChange('');
        return;
      }

      // Validate it's in San Jose
      if (city.toLowerCase() !== 'san jose') {
        alert('Please select an address within San Jose, CA');
        // Call onPlaceSelected FIRST to set the flag, then clear the input
        onPlaceSelected({
          address: '',
          city: '',
          state: '',
          zipcode: '',
        });
        onChange('');
        return;
      }

      // Call onPlaceSelected to set the flag before any onChange events
      onPlaceSelected({
        address: fullAddress,
        city,
        state,
        zipcode,
      });
    }
  };

  if (loadError) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Address autocomplete unavailable"
        className={className}
      />
    );
  }

  if (!isLoaded) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Loading..."
        className={className}
        disabled
      />
    );
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: 'us' },
        types: ['address'],
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    </Autocomplete>
  );
}

