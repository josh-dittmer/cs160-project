"use client";

import { Autocomplete } from '@react-google-maps/api';
import { useState, useRef, useEffect } from 'react';
import toast from "react-hot-toast";

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
  // Just check if Google Maps API is loaded (loaded by parent component)
  const [isMapsReady, setIsMapsReady] = useState(false);
  
  useEffect(() => {
    // Check if API is loaded
    const checkLoaded = () => {
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        setIsMapsReady(true);
      }
    };
    
    checkLoaded();
    
    // If not loaded yet, check periodically
    const interval = setInterval(checkLoaded, 100);
    
    return () => clearInterval(interval);
  }, []);

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
      // No types restriction - allows searching by place names, addresses, etc.
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
        toast.error('Please select a complete address with a house or building number (e.g., "123 Main St" not just "Main St")');
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
        toast.error('Please select an address within San Jose, CA');
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

  if (!isMapsReady) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Loading autocomplete..."
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
        // No types restriction - allows searching by place names, addresses, etc.
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) {
            // Simulate down arrow to select first suggestion, then let autocomplete handle it
            const downArrowEvent = new KeyboardEvent('keydown', {
              key: 'ArrowDown',
              code: 'ArrowDown',
              keyCode: 40,
              bubbles: true
            });
            e.target.dispatchEvent(downArrowEvent);
            
            // Let the Enter key propagate naturally to select the highlighted item
            // Google Places will handle the rest
          }
        }}
        placeholder={placeholder}
        className={className}
      />
    </Autocomplete>
  );
}

